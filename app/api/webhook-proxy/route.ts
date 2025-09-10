
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { webhookUrl, payload } = await request.json()

    if (!webhookUrl || !payload) {
      return NextResponse.json(
        { error: 'Webhook URL and payload are required' },
        { status: 400 }
      )
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl)
    } catch {
      return NextResponse.json(
        { error: 'Invalid webhook URL format' },
        { status: 400 }
      )
    }

    // Make request to the actual webhook
    console.log('Making request to webhook:', webhookUrl)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Ads-Report-Portal/1.0',
      },
      body: JSON.stringify(payload)
    })
    
    console.log('Webhook response status:', response.status, response.statusText)
    console.log('Webhook response headers:', Object.fromEntries(response.headers.entries()))

    let responseData
    const contentType = response.headers.get('content-type') || ''
    
    try {
      // Always try text first, then JSON if it's valid JSON
      const textData = await response.text()
      console.log('Webhook response text (first 200 chars):', textData.substring(0, 200))
      
      // Try to parse as JSON if content-type suggests it or if it looks like JSON
      if (contentType.includes('application/json') || (textData.trim().startsWith('{') && textData.trim().endsWith('}'))) {
        try {
          responseData = JSON.parse(textData)
          console.log('Successfully parsed as JSON')
        } catch (jsonError) {
          // If JSON parsing fails, keep as text
          console.log('JSON parsing failed, keeping as text:', jsonError)
          responseData = textData
        }
      } else {
        console.log('Treating response as text (content-type:', contentType, ')')
        responseData = textData
      }
    } catch (parseError) {
      console.error('Failed to read response:', parseError)
      responseData = 'Unable to read response from webhook'
    }

    // For successful responses (200-299), always return success
    if (response.ok) {
      return NextResponse.json({
        success: true,
        data: responseData,
        status: response.status,
        statusText: response.statusText
      }, { status: 200 })
    }

    // For error responses (400+), return as error but with response details
    return NextResponse.json(
      { 
        error: `Webhook responded with ${response.status}: ${response.statusText}`,
        details: responseData
      },
      { status: response.status }
    )

  } catch (error) {
    console.error('Webhook proxy error:', error)
    
    // Handle network errors, timeouts, etc.
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Failed to connect to webhook. Please check the URL and try again.',
          details: error.message 
        },
        { status: 503 }
      )
    }

    // Return more detailed error information
    return NextResponse.json(
      { 
        error: 'Internal server error occurred while processing webhook request',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to submit webhook requests.' },
    { status: 405 }
  )
}
