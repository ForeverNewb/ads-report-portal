
'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

export default function TestWebhook() {
  const [isTestingReach, setIsTestingReach] = useState(false)
  const [isTestingPost, setIsTestingPost] = useState(false)
  const [reachResult, setReachResult] = useState<string>('')
  const [postResult, setPostResult] = useState<string>('')

  const testWebhookReachability = async () => {
    setIsTestingReach(true)
    setReachResult('')
    
    try {
      const webhookUrl = 'https://roger-roger.app.n8n.cloud/webhook-test/bb43757d-0f41-4c86-941c-8354d9fa07c9'
      
      // Use webhook-proxy to avoid CORS issues
      const response = await fetch('/api/webhook-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          payload: { test: true }
        })
      })
      
      if (response.ok) {
        setReachResult('✅ Webhook URL is reachable')
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        setReachResult(`❌ Webhook test failed: ${error.error || 'Unknown error'}`)
      }
    } catch (error) {
      setReachResult(`❌ Failed to reach webhook: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsTestingReach(false)
    }
  }

  const testWebhookPost = async () => {
    setIsTestingPost(true)
    setPostResult('')
    
    try {
      const webhookUrl = 'https://roger-roger.app.n8n.cloud/webhook-test/bb43757d-0f41-4c86-941c-8354d9fa07c9'
      
      const testPayload = {
        client: "Test Client",
        channels: ["Test Channel"],
        startDate: "2025-01-01",
        endDate: "2025-01-31", 
        previousStartDate: "2024-12-01",
        previousEndDate: "2024-12-31",
        fileName: "test-report.html",
        timestamp: new Date().toISOString()
      }
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second test timeout
      
      // Use webhook-proxy to avoid CORS issues
      const response = await fetch('/api/webhook-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: webhookUrl,
          payload: testPayload
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
      
      if (response.ok) {
        const result = await response.json()
        setPostResult(`✅ Webhook accepted POST request: 200\n\nResponse: ${JSON.stringify(result.data || result, null, 2).substring(0, 200)}...`)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        if (response.status === 524) {
          setPostResult(`⚠️ Cloudflare timeout (524) - Your n8n workflow is taking longer than expected. This is normal for AI analysis.`)
        } else {
          setPostResult(`⚠️ Webhook returned ${response.status}: ${errorData.error || 'Unknown error'}`)
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setPostResult('⚠️ Test timed out after 30 seconds (normal for quick test)')
      } else {
        setPostResult(`❌ POST test failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    } finally {
      setIsTestingPost(false)
    }
  }

  return (
    <Card className="dark-card fade-in mb-6">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-yellow-500" />
          Webhook Testing & Troubleshooting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-gray-300 text-sm">
          <p><strong>Common Issues:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>524 Timeout:</strong> n8n workflow takes longer than Cloudflare's 100-second limit</li>
            <li><strong>Connection refused:</strong> n8n service is down or URL is incorrect</li>
            <li><strong>CORS errors:</strong> n8n doesn't accept requests from this domain</li>
          </ul>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={testWebhookReachability}
            disabled={isTestingReach}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-700/50"
          >
            {isTestingReach ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Reachability'
            )}
          </Button>
          
          <Button 
            onClick={testWebhookPost}
            disabled={isTestingPost}
            variant="outline"
            className="border-slate-600 text-white hover:bg-slate-700/50"
          >
            {isTestingPost ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testing POST...
              </>
            ) : (
              'Test POST (30s limit)'
            )}
          </Button>
        </div>
        
        {reachResult && (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{reachResult}</pre>
          </div>
        )}
        
        {postResult && (
          <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-3">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">{postResult}</pre>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
