import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { payment, userSubscription, userUsage } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = await req.json()

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
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Update payment status
    await db
      .update(payment)
      .set({
        status: 'completed',
        razorpayPaymentId,
        razorpaySignature,
        updatedAt: new Date(),
      })
      .where(eq(payment.razorpayOrderId, razorpay_order_id))

    // Create or update subscription
    const existingSubscription = await db.select().from(userSubscription).where(eq(userSubscription.userId, userId))

    const renewalDate = new Date()
    renewalDate.setMonth(renewalDate.getMonth() + 1)

    if (existingSubscription.length > 0) {
      await db
        .update(userSubscription)
        .set({
          planId,
          status: 'active',
          renewalDate,
          razorpaySubscriptionId: razorpay_payment_id,
          updatedAt: new Date(),
        })
        .where(eq(userSubscription.id, existingSubscription[0].id))
    } else {
      // Create new subscription
      await db.insert(userSubscription).values({
        id: uuidv4(),
        userId,
        planId,
        status: 'active',
        renewalDate,
        razorpaySubscriptionId: razorpay_payment_id,
        createdAt: new Date(),
      })
    }

    // Initialize or reset usage
    const existingUsage = await db.select().from(userUsage).where(eq(userUsage.userId, userId))

    if (existingUsage.length > 0) {
      await db
        .update(userUsage)
        .set({
          messagesUsed: 0,
          currentMonthReset: new Date(),
        })
        .where(eq(userUsage.id, existingUsage[0].id))
    } else {
      await db.insert(userUsage).values({
        id: uuidv4(),
        userId,
        subscriptionId: existingSubscription.length > 0 ? existingSubscription[0].id : undefined,
        messagesUsed: 0,
        createdAt: new Date(),
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Payment Verification Error]:', error)
    return NextResponse.json({ error: 'Failed to verify payment' }, { status: 500 })
  }
}
