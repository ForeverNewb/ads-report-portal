import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { webhookUrl, payload } = body

    if (!webhookUrl) {
      return NextResponse.json(
        { error: 'Webhook URL is required' },
        { status: 400 }
      )
    }

    // Make request to the actual webhook with extended timeout
    console.log('Making request to webhook:', webhookUrl)
    console.log('Payload:', JSON.stringify(payload, null, 2))
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout
    
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Ads-Report-Portal/1.0',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
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
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      // Handle timeout specifically
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        return NextResponse.json(
          { 
            error: 'Webhook request timed out after 5 minutes. Your n8n workflow may still be running in the background.',
            details: 'The request was cancelled due to timeout, but the webhook processing may continue on the server.'
          },
          { status: 408 }
        )
      }
      
      // Re-throw other fetch errors to be handled by the main catch block
      throw fetchError
    }

  } catch (error) {
    console.error('Webhook proxy error:', error)
    
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        details: 'Failed to process webhook request'
      },
      { status: 500 }
    )
  }
}
