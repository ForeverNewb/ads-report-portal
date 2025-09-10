
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Mock successful signup
    return NextResponse.json({ 
      success: true,
      message: 'Account created successfully',
      user: {
        email: body.email || 'user@example.com',
        name: body.name || 'User'
      }
    }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ 
      success: false,
      message: 'Invalid request format' 
    }, { status: 400 })
  }
}
