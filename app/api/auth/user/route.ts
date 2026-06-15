import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, getAuthToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const cookieStore = req.cookies
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ user: null })
    }

    const user = await getAuthUser(token)
    return NextResponse.json({ user })
  } catch (error) {
    console.error('Get user API error:', error)
    return NextResponse.json({ user: null })
  }
}
