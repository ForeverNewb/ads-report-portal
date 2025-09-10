
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  // Mock successful login with redirect
  return NextResponse.redirect(new URL('/', request.url), 302)
}

export async function GET(request: NextRequest) {
  // Handle GET requests for sign in page
  return NextResponse.redirect(new URL('/', request.url), 302)
}
