import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json()

    if (!username || !email || !password) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 })
    }

    const result = await registerUser(username, email, password)

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 })
    }

    return NextResponse.json({
      message: 'User registered successfully',
      user: result.user,
    })
  } catch (error) {
    console.error('Register API error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
