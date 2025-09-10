
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ 
    user: null,
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  })
}
