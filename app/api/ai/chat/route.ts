import { generateText, streamText } from 'ai'
import { openai } from '@ai-sdk/openai'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { chatMessage, userSubscription, subscriptionPlan, userUsage } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 })
    }

    const { messages, conversationId } = await req.json()
    const userId = session.user.id

    // Check user's subscription and limits
    const subscription = await db
      .select()
      .from(userSubscription)
      .where(eq(userSubscription.userId, userId))
      .limit(1)

    if (!subscription.length || subscription[0].status !== 'active') {
      return new Response('No active subscription', { status: 403 })
    }

    // Get plan limits
    const plan = await db
      .select()
      .from(subscriptionPlan)
      .where(eq(subscriptionPlan.id, subscription[0].planId))
      .limit(1)

    const maxMessages = plan[0]?.aiMessages || 100

    // Check usage
    const usage = await db
      .select()
      .from(userUsage)
      .where(eq(userUsage.userId, userId))
      .limit(1)

    if (usage[0] && usage[0].messagesUsed >= maxMessages) {
      return new Response('Message limit exceeded', { status: 429 })
    }

    // Stream response from OpenAI
    const result = await streamText({
      model: openai('gpt-4-turbo'),
      messages,
    })

    // Save conversation
    const newConvId = conversationId || uuidv4()

    for (const message of messages) {
      await db.insert(chatMessage).values({
        id: uuidv4(),
        userId,
        conversationId: newConvId,
        role: message.role,
        content: message.content,
        createdAt: new Date(),
      })
    }

    // Save assistant response
    let fullResponse = ''
    const response = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk
            controller.enqueue(new TextEncoder().encode(chunk))
          }

          // Save final response
          await db.insert(chatMessage).values({
            id: uuidv4(),
            userId,
            conversationId: newConvId,
            role: 'assistant',
            content: fullResponse,
            createdAt: new Date(),
          })

          // Update usage
          if (usage.length > 0) {
            await db
              .update(userUsage)
              .set({ messagesUsed: (usage[0].messagesUsed || 0) + messages.length + 1 })
              .where(eq(userUsage.id, usage[0].id))
          }

          controller.close()
        } catch (error) {
          controller.error(error)
        }
      },
    })

    return new Response(response, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[AI Chat Error]:', error)
    return new Response('Internal server error', { status: 500 })
  }
}
