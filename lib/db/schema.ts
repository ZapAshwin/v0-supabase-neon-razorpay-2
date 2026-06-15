import { text, timestamp, boolean, integer, decimal, jsonb, pgTable } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Better Auth Tables
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  emailVerified: timestamp('emailVerified'),
  name: text('name'),
  image: text('image'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  isTwoFactorEnabled: boolean('isTwoFactorEnabled').default(false),
  twoFactorConfirmedEmail: text('twoFactorConfirmedEmail'),
})

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expiresAt').notNull(),
  token: text('token').unique().notNull(),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
  userId: text('userId').notNull(),
  activeExpires: integer('activeExpires'),
  idleExpires: integer('idleExpires'),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('providerAccountId').notNull(),
  refreshToken: text('refreshToken'),
  accessToken: text('accessToken'),
  expiresAt: timestamp('expiresAt'),
  password: text('password'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expiresAt').notNull(),
  createdAt: timestamp('createdAt'),
  updatedAt: timestamp('updatedAt'),
})

// App Tables
export const subscriptionPlan = pgTable('subscription_plan', {
  id: text('id').primaryKey(),
  name: text('name').unique().notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR'),
  interval: text('interval').default('month'),
  description: text('description'),
  features: jsonb('features'),
  aiMessages: integer('aiMessages'),
  storageGB: integer('storageGB'),
  isActive: boolean('isActive').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const userSubscription = pgTable('user_subscription', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  planId: text('planId').notNull(),
  status: text('status').default('active'),
  startDate: timestamp('startDate').defaultNow(),
  endDate: timestamp('endDate'),
  renewalDate: timestamp('renewalDate'),
  razorpaySubscriptionId: text('razorpaySubscriptionId'),
  isAutoRenew: boolean('isAutoRenew').default(true),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const payment = pgTable('payment', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  subscriptionId: text('subscriptionId'),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').default('INR'),
  status: text('status').default('pending'),
  razorpayOrderId: text('razorpayOrderId').unique(),
  razorpayPaymentId: text('razorpayPaymentId').unique(),
  razorpaySignature: text('razorpaySignature'),
  planId: text('planId'),
  createdAt: timestamp('createdAt').defaultNow(),
  updatedAt: timestamp('updatedAt').defaultNow(),
})

export const chatMessage = pgTable('chat_message', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  conversationId: text('conversationId').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens'),
  createdAt: timestamp('createdAt').defaultNow(),
})

export const userUsage = pgTable('user_usage', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull(),
  subscriptionId: text('subscriptionId'),
  messagesUsed: integer('messagesUsed').default(0),
  storageUsedMB: integer('storageUsedMB').default(0),
  currentMonthReset: timestamp('currentMonthReset').defaultNow(),
})

// Relations
export const userRelations = relations(user, ({ many }) => ({
  subscriptions: many(userSubscription),
  payments: many(payment),
  chatMessages: many(chatMessage),
  usage: many(userUsage),
}))

export const subscriptionPlanRelations = relations(subscriptionPlan, ({ many }) => ({
  subscriptions: many(userSubscription),
}))

export const userSubscriptionRelations = relations(userSubscription, ({ one, many }) => ({
  user: one(user, { fields: [userSubscription.userId], references: [user.id] }),
  plan: one(subscriptionPlan, { fields: [userSubscription.planId], references: [subscriptionPlan.id] }),
  payments: many(payment),
}))
