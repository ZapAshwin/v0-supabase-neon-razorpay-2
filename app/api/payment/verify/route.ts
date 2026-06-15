import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { neon } from '@neondatabase/serverless'
import { getAuthUser } from '@/lib/auth'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json()

    // Verify Razorpay signature
    const body = razorpay_order_id + '|' + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest('hex')

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // Get authenticated user
    const token = req.cookies.get('auth_token')?.value
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getAuthUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Save subscription to database
    const monthlyPrice = plan === 'free' ? 0 : plan === 'pro' ? 29 : 99
    const renewalDate = new Date()
    renewalDate.setMonth(renewalDate.getMonth() + 1)

    const result = await sql`
      INSERT INTO cloudynic_subscriptions (user_id, plan_type, status, razorpay_order_id, razorpay_payment_id, monthly_cost, renewal_date)
      VALUES (${user.id}, ${plan}, 'active', ${razorpay_order_id}, ${razorpay_payment_id}, ${monthlyPrice}, ${renewalDate.toISOString()})
      ON CONFLICT (user_id) DO UPDATE
      SET plan_type = ${plan}, status = 'active', razorpay_order_id = ${razorpay_order_id}, razorpay_payment_id = ${razorpay_payment_id}, monthly_cost = ${monthlyPrice}, renewal_date = ${renewalDate.toISOString()}, updated_at = NOW()
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    // Update user's plan type
    await sql`
      UPDATE cloudynic_auth_users
      SET plan_type = ${plan}, updated_at = NOW()
      WHERE id = ${user.id}
    `

    // Generate an API key for the new subscription if they don't have one
    const existingKeys = await sql`
      SELECT COUNT(*) as count FROM cloudynic_api_keys WHERE user_id = ${user.id}
    `

    if ((existingKeys[0] as any).count === 0) {
      const apiKey = `cloudynic_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
      await sql`
        INSERT INTO cloudynic_api_keys (user_id, api_key, key_name)
        VALUES (${user.id}, ${apiKey}, ${plan.toUpperCase()} + ' Plan Key')
      `
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error verifying payment:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
