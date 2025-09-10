
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

    // Helper function to make webhook request with retries
    async function makeWebhookRequest(url: string, data: any, attempt: number = 1): Promise<Response> {
      console.log(`Making request to webhook (attempt ${attempt}):`, url)
      console.log('Payload:', JSON.stringify(data, null, 2))
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minutes timeout
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Ads-Report-Portal/1.0',
            'Cache-Control': 'no-cache',
          },
          body: JSON.stringify(data),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        // Handle 524 timeout specifically
        if (response.status === 524) {
          console.log('Received 524 timeout from Cloudflare')
          if (attempt < 3) {
            console.log(`Retrying in ${attempt * 10} seconds...`)
            await new Promise(resolve => setTimeout(resolve, attempt * 10000))
            return makeWebhookRequest(url, data, attempt + 1)
          }
          // If all retries failed, throw specific error
          throw new Error('CLOUDFLARE_TIMEOUT')
        }
        
        return response
      } catch (fetchError) {
        clearTimeout(timeoutId)
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          throw new Error('REQUEST_TIMEOUT')
        }
        
        // Retry on network errors (but not on 524 which is handled above)
        if (attempt < 3 && fetchError instanceof TypeError) {
          console.log(`Network error, retrying in ${attempt * 5} seconds...`)
          await new Promise(resolve => setTimeout(resolve, attempt * 5000))
          return makeWebhookRequest(url, data, attempt + 1)
        }
        
        throw fetchError
      }
    }
    
    try {
      const response = await makeWebhookRequest(webhookUrl, payload)
      
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
      
      // Handle specific error types
      if (fetchError instanceof Error) {
        if (fetchError.message === 'CLOUDFLARE_TIMEOUT') {
          return NextResponse.json(
            { 
              error: 'n8n Cloudflare timeout (524) after multiple retries',
              details: 'Your n8n workflow is taking longer than Cloudflare\'s 100-second limit. Consider optimizing your workflow or using a direct n8n URL (without Cloudflare proxy).',
              suggestion: 'Try using a direct n8n webhook URL or contact your n8n provider about timeout limits.'
            },
            { status: 524 }
          )
        }
        
        if (fetchError.message === 'REQUEST_TIMEOUT') {
          return NextResponse.json(
            { 
              error: 'Request timed out after 5 minutes',
              details: 'The webhook request exceeded our maximum timeout. Your n8n workflow may still be processing.',
              suggestion: 'Check your n8n workflow logs or try again later.'
            },
            { status: 408 }
          )
        }
      }
      
      // Re-throw other fetch errors to be handled by the main catch block
      throw fetchError
    }

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
