import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { payment } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    // Validate environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Razorpay credentials not configured' }, { status: 500 })
    }

    // Get authenticated user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const { planId, amount } = await req.json()

    if (!planId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create Razorpay order (amount in paise for INR)
    const receipt = `${session.user.id.substring(0, 15)}-${Date.now()}`.substring(0, 40)
    const order = await razorpay.orders.create({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt,
      notes: {
        planId,
        userId: session.user.id,
      },
    })

    // Save payment record
    await db.insert(payment).values({
      id: uuidv4(),
      userId: session.user.id,
      amount: amount.toString(),
      currency: 'INR',
      status: 'pending',
      razorpayOrderId: order.id,
      planId,
      createdAt: new Date(),
    })

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    })
  } catch (error) {
    console.error('[Payment Error]:', error)
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })
  }
}
