'use server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { user, userUsage, userSubscription } from '@/lib/db/schema'
import { headers } from 'next/headers'
import { eq } from 'drizzle-orm'

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  return session?.user || null
}

export async function getUserById(userId: string) {
  const result = await db.select().from(user).where(eq(user.id, userId)).limit(1)
  return result[0] || null
}

export async function getUserUsage(userId: string) {
  const result = await db.select().from(userUsage).where(eq(userUsage.userId, userId)).limit(1)
  return result[0] || null
}

export async function getUserSubscription(userId: string) {
  const result = await db.select().from(userSubscription).where(eq(userSubscription.userId, userId)).limit(1)
  return result[0] || null
}
