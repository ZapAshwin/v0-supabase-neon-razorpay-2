import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'

const sql = neon(process.env.DATABASE_URL!)

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRY = '7d'

export interface User {
  id: string
  username: string
  email: string
  created_at: string
  plan_type: 'free' | 'pro' | 'pro_max'
}

export interface AuthSession {
  user: User
  token: string
}

// Initialize users table
export async function initializeAuthTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS cloudynic_auth_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) NOT NULL UNIQUE,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        plan_type VARCHAR(50) NOT NULL DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'pro_max')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `
    console.log('Auth table initialized successfully')
  } catch (error) {
    console.error('Error initializing auth table:', error)
  }
}

export async function registerUser(
  username: string,
  email: string,
  password: string
): Promise<{ success: boolean; message: string; user?: User }> {
  try {
    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM cloudynic_auth_users WHERE username = ${username} OR email = ${email}
    `

    if (existingUser.length > 0) {
      return {
        success: false,
        message: 'Username or email already exists',
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create user
    const result = await sql`
      INSERT INTO cloudynic_auth_users (username, email, password_hash, plan_type)
      VALUES (${username}, ${email}, ${hashedPassword}, 'free')
      RETURNING id, username, email, created_at, plan_type
    `

    if (result.length === 0) {
      return { success: false, message: 'Failed to create user' }
    }

    const user = result[0] as User
    return { success: true, message: 'User created successfully', user }
  } catch (error) {
    console.error('Registration error:', error)
    return { success: false, message: 'Registration failed' }
  }
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; message: string; session?: AuthSession }> {
  try {
    // Get user
    const users = await sql`
      SELECT * FROM cloudynic_auth_users WHERE username = ${username}
    `

    if (users.length === 0) {
      return { success: false, message: 'Invalid username or password' }
    }

    const user = users[0] as any
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)

    if (!isPasswordValid) {
      return { success: false, message: 'Invalid username or password' }
    }

    // Create JWT token
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRY }
    )

    const authUser: User = {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      plan_type: user.plan_type,
    }

    return {
      success: true,
      message: 'Login successful',
      session: { user: authUser, token },
    }
  } catch (error) {
    console.error('Login error:', error)
    return { success: false, message: 'Login failed' }
  }
}

export async function getAuthUser(token: string): Promise<User | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; email: string }

    const users = await sql`
      SELECT * FROM cloudynic_auth_users WHERE id = ${decoded.id}
    `

    if (users.length === 0) {
      return null
    }

    const user = users[0] as any
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      created_at: user.created_at,
      plan_type: user.plan_type,
    }
  } catch (error) {
    return null
  }
}

export async function setAuthCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })
}

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('auth_token')?.value || null
}

export async function clearAuthCookie() {
  const cookieStore = await cookies()
  cookieStore.delete('auth_token')
}
