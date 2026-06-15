import { NextRequest, NextResponse } from 'next/server'
import { loginUser, setAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ message: 'Missing username or password' }, { status: 400 })
    }

    const result = await loginUser(username, password)

    if (!result.success || !result.session) {
      return NextResponse.json({ message: result.message }, { status: 401 })
    }

    // Set auth cookie
    await setAuthCookie(result.session.token)

    return NextResponse.json({
      message: 'Login successful',
      user: result.session.user,
    })
  } catch (error) {
    console.error('Login API error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
