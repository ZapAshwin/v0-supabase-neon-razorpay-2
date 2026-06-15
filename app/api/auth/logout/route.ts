import { NextRequest, NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    await clearAuthCookie()
    return NextResponse.json({ message: 'Logged out successfully' })
  } catch (error) {
    console.error('Logout API error:', error)
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 })
  }
}
