
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { LogOut, Send, Trash2, Copy, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const CLIENTS = [
  'GA4 - Clean Planet Services',
  'GA4 - Clean Planet Franchise',
  'Lucidity Website',
  'https://www.minervaadvocacy.co.nz/',
  'www.whitlockwilliams.co.nz - GA4',
  'Growth Rocket - GA4',
  'Alxemy',
  'Checkmate New Zealand',
  'GA4 Roger Roger Marketing',
  'Figure8 NZ (https://figure8.co.nz)',
  'ICARAS'
]

const CHANNELS = [
  'Google Ads',
  'Google Search Console',
  'Facebook Ads',
  'LinkedIn Ads',
  'Google Analytics'
]

interface FormData {
  webhookUrl: string
  client: string
  channels: string[]
  startDate: string
  endDate: string
  compareWith: boolean
  compareStartDate: string
  compareEndDate: string
  fileName: string
}

interface WebhookResponse {
  status: 'success' | 'error' | null
  data: any
  error?: string
  timestamp?: string
}

export function ReportBuilder() {
  const [formData, setFormData] = useState<FormData>({
    webhookUrl: '',
    client: '',
    channels: [],
    startDate: '',
    endDate: '',
    compareWith: false,
    compareStartDate: '',
    compareEndDate: '',
    fileName: ''
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [webhookResponse, setWebhookResponse] = useState<WebhookResponse>({ status: null, data: null })
  const [activeTab, setActiveTab] = useState('raw')

  // Load form data from localStorage on component mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedFormData = localStorage.getItem('ads_portal_form_data')
      if (savedFormData && savedFormData !== '{}') {
        try {
          const parsedData = JSON.parse(savedFormData)
          // Only restore if there's actual data
          if (parsedData && Object.keys(parsedData).length > 0) {
            setFormData(parsedData)
            console.log('✅ Form data restored from localStorage')
          }
        } catch (error) {
          console.log('❌ Failed to load saved form data:', error)
          localStorage.removeItem('ads_portal_form_data')
        }
      }
    }
  }, [])

  // Save form data to localStorage whenever it changes (with debouncing)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timeoutId = setTimeout(() => {
        try {
          localStorage.setItem('ads_portal_form_data', JSON.stringify(formData))
          console.log('💾 Form data saved to localStorage')
        } catch (error) {
          console.log('❌ Failed to save form data:', error)
        }
      }, 100) // Debounce to avoid excessive saves

      return () => clearTimeout(timeoutId)
    }
  }, [formData])

  // Generate live payload preview
  const generatePayload = () => {
    const payload: any = {
      client: formData.client || null,
      channels: formData.channels.length > 0 ? formData.channels : null,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      fileName: formData.fileName || null,
      timestamp: new Date().toISOString()
    }

    // Add comparison dates if enabled
    if (formData.compareWith) {
      payload.previousStartDate = formData.compareStartDate || null
      payload.previousEndDate = formData.compareEndDate || null
    }

    return payload
  }

  const handleChannelToggle = (channel: string) => {
    setFormData(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }))
  }

  const handleClear = () => {
    const clearedData = {
      webhookUrl: '',
      client: '',
      channels: [],
      startDate: '',
      endDate: '',
      compareWith: false,
      compareStartDate: '',
      compareEndDate: '',
      fileName: ''
    }
    setFormData(clearedData)
    setWebhookResponse({ status: null, data: null })
    // Clear saved form data from localStorage
    localStorage.removeItem('ads_portal_form_data')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!formData.webhookUrl) {
      toast({
        title: "Error",
        description: "Webhook URL is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.client) {
      toast({
        title: "Error",
        description: "Client selection is required",
        variant: "destructive",
      })
      return
    }

    if (formData.channels.length === 0) {
      toast({
        title: "Error",
        description: "At least one channel must be selected",
        variant: "destructive",
      })
      return
    }

    if (!formData.startDate) {
      toast({
        title: "Error",
        description: "Start date is required",
        variant: "destructive",
      })
      return
    }

    if (!formData.endDate) {
      toast({
        title: "Error",
        description: "End date is required",
        variant: "destructive",
      })
      return
    }

    // Validate date range
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      toast({
        title: "Error",
        description: "Start date must be before end date",
        variant: "destructive",
      })
      return
    }

    // Validate comparison dates if comparison is enabled
    if (formData.compareWith) {
      if (!formData.compareStartDate || !formData.compareEndDate) {
        toast({
          title: "Error",
          description: "Comparison dates are required when comparison mode is enabled",
          variant: "destructive",
        })
        return
      }

      if (new Date(formData.compareStartDate) > new Date(formData.compareEndDate)) {
        toast({
          title: "Error",
          description: "Comparison start date must be before comparison end date",
          variant: "destructive",
        })
        return
      }
    }

    setIsSubmitting(true)
    setWebhookResponse({ status: null, data: null })

    try {
      const payload = generatePayload()
      
      const response = await fetch('/api/webhook-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          webhookUrl: formData.webhookUrl,
          payload
        })
      })

      let result
      try {
        const responseText = await response.text()
        
        // Try to parse as JSON first
        if (responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
          try {
            result = JSON.parse(responseText)
          } catch {
            // If JSON parsing fails, treat as text response
            result = { data: responseText, success: response.ok }
          }
        } else {
          // Not JSON, treat as text
          result = { data: responseText, success: response.ok }
        }
      } catch (parseError) {
        throw new Error('Failed to read server response')
      }
      
      if (response.ok) {
        setWebhookResponse({
          status: 'success',
          data: result.data || result,
          timestamp: new Date().toLocaleString()
        })
        toast({
          title: "Success",
          description: "Report request submitted successfully",
        })
      } else {
        // Enhanced error handling with more details
        const errorMsg = result.error || result.data || 'Failed to submit request'
        const errorDetails = result.details ? ` Details: ${result.details}` : ''
        throw new Error(errorMsg + errorDetails)
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setWebhookResponse({
        status: 'error',
        data: null,
        error: errorMessage,
        timestamp: new Date().toLocaleString()
      })
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('ads_portal_access')
    window.location.reload()
  }

  const copyPayload = () => {
    navigator.clipboard.writeText(JSON.stringify(generatePayload(), null, 2))
    toast({
      title: "Copied",
      description: "Payload copied to clipboard",
    })
  }

  return (
    <div className="min-h-screen gradient-bg flex flex-col">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-black/20 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">YOUR COMPANY</h1>
            <span className="text-white">Ads Report Portal</span>
            <Badge className="lime-bg text-black font-medium">Next.js</Badge>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-white hover:text-lime-400">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-full mx-auto p-6 flex-1">
        <div className="grid lg:grid-cols-2 gap-6" style={{ height: 'calc(100vh - 180px)' }}>
          {/* Left Column - Form */}
          <Card className="dark-card fade-in flex flex-col h-full">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-lime-500 rounded-full"></div>
                Ads Report Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <div className="flex-1 space-y-6">
                {/* Integration Section */}
                <div className="space-y-4">
                  <Label className="text-lime-400 text-sm font-medium">INTEGRATION *</Label>
                  <Input
                    placeholder="https://your-webhook-url-endpoint.com/webhook"
                    value={formData.webhookUrl}
                    onChange={(e) => setFormData(prev => ({ ...prev, webhookUrl: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-lime-500"
                  />
                </div>

                {/* Client Selection */}
                <div className="space-y-4">
                  <Label className="text-lime-400 text-sm font-medium">CLIENT *</Label>
                  <Select value={formData.client} onValueChange={(value) => setFormData(prev => ({ ...prev, client: value }))}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white focus:border-lime-500">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-600">
                      {CLIENTS.map((client) => (
                        <SelectItem key={client} value={client} className="text-white hover:bg-slate-700 focus:bg-slate-700">
                          {client}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Channels */}
                <div className="space-y-4">
                  <Label className="text-lime-400 text-sm font-medium">CHANNELS *</Label>
                  <div className="flex flex-wrap gap-2">
                    {CHANNELS.map((channel) => (
                      <Button
                        key={channel}
                        type="button"
                        variant="outline"
                        size="sm"
                        className={`channel-button border-slate-600 text-white ${
                          formData.channels.includes(channel) 
                            ? 'active' 
                            : 'hover:bg-slate-700/50'
                        }`}
                        onClick={() => handleChannelToggle(channel)}
                      >
                        {channel}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div className="space-y-4">
                  <Label className="text-lime-400 text-sm font-medium">DATE RANGE *</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                      className="bg-slate-700/50 border-slate-600 text-white focus:border-lime-500"
                    />
                    <Input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                      className="bg-slate-700/50 border-slate-600 text-white focus:border-lime-500"
                    />
                  </div>

                  {/* Compare with toggle */}
                  <div className="flex items-center space-x-3">
                    <Switch
                      checked={formData.compareWith}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, compareWith: checked }))}
                      className="data-[state=checked]:bg-lime-500"
                    />
                    <Label className="text-white text-sm">Compare with</Label>
                  </div>

                  {formData.compareWith && (
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="date"
                        value={formData.compareStartDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, compareStartDate: e.target.value }))}
                        className="bg-slate-700/50 border-slate-600 text-white focus:border-lime-500"
                      />
                      <Input
                        type="date"
                        value={formData.compareEndDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, compareEndDate: e.target.value }))}
                        className="bg-slate-700/50 border-slate-600 text-white focus:border-lime-500"
                      />
                    </div>
                  )}
                </div>

                {/* File Name */}
                <div className="space-y-4">
                  <Label className="text-lime-400 text-sm font-medium">FILE NAME</Label>
                  <Input
                    placeholder="Enter file name..."
                    value={formData.fileName}
                    onChange={(e) => setFormData(prev => ({ ...prev, fileName: e.target.value }))}
                    className="bg-slate-700/50 border-slate-600 text-white placeholder-gray-400 focus:border-lime-500"
                  />
                </div>

                {/* Live Payload Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-lime-400 text-sm font-medium">LIVE PAYLOAD PREVIEW</Label>
                    <Button type="button" variant="ghost" size="sm" onClick={copyPayload} className="text-gray-400 hover:text-lime-400">
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 max-h-48 overflow-y-auto scrollbar-hide">
                    <pre className="json-preview text-gray-300 whitespace-pre-wrap">
                      {JSON.stringify(generatePayload(), null, 2)}
                    </pre>
                  </div>
                </div>

                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 mt-6 border-t border-slate-700/50 flex-shrink-0">
                  <Button type="button" variant="outline" onClick={handleClear} className="border-slate-600 text-white hover:bg-slate-700/50">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                  <Button type="submit" disabled={isSubmitting} className="lime-bg text-black hover:bg-lime-400 font-medium flex-1">
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Right Column - Response */}
          <Card className="dark-card fade-in flex flex-col h-full">
            <CardHeader className="flex-shrink-0">
              <CardTitle className="text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-lime-500 rounded-full"></div>
                Webhook Response
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col overflow-hidden">
              {webhookResponse.status === null ? (
                <div className="text-center flex-1 flex items-center justify-center text-gray-400">
                  <div>
                    <Send className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>Submit a request to see the response here</p>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  {/* Status indicator */}
                  <div className="flex items-center gap-2 mb-4 flex-shrink-0">
                    {webhookResponse.status === 'success' ? (
                      <CheckCircle className="w-5 h-5 text-lime-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <span className={`text-sm font-medium ${
                      webhookResponse.status === 'success' ? 'text-lime-400' : 'text-red-400'
                    }`}>
                      {webhookResponse.status === 'success' ? 'Success' : 'Error'}
                    </span>
                    {webhookResponse.timestamp && (
                      <span className="text-xs text-gray-400 ml-auto">
                        {webhookResponse.timestamp}
                      </span>
                    )}
                  </div>

                  {/* Response tabs */}
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 overflow-hidden">
                    <TabsList className="bg-slate-800 border-slate-600 flex-shrink-0">
                      <TabsTrigger value="raw" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                        Raw JSON
                      </TabsTrigger>
                      <TabsTrigger value="rendered" className="data-[state=active]:bg-lime-500 data-[state=active]:text-black">
                        Rendered HTML
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="raw" className="mt-4 flex-1 overflow-hidden">
                      <div className="bg-slate-800/50 border border-slate-600 rounded-lg p-4 h-full overflow-y-auto scrollbar-hide">
                        <pre className="json-preview text-gray-300 whitespace-pre-wrap text-xs">
                          {webhookResponse.status === 'error' 
                            ? JSON.stringify({ error: webhookResponse.error }, null, 2)
                            : (() => {
                                // Clean up the JSON display
                                const data = webhookResponse.data
                                if (typeof data === 'object' && data !== null) {
                                  // If it's an object, format it nicely
                                  return JSON.stringify(data, null, 2)
                                } else if (typeof data === 'string') {
                                  // If it's a string, try to parse and reformat
                                  try {
                                    const parsed = JSON.parse(data)
                                    return JSON.stringify(parsed, null, 2)
                                  } catch {
                                    return data
                                  }
                                }
                                return JSON.stringify(data, null, 2)
                              })()
                          }
                        </pre>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="rendered" className="mt-4 flex-1 overflow-hidden">
                      <div className="bg-white border border-slate-600 rounded-lg overflow-hidden h-full">
                        {webhookResponse.status === 'error' ? (
                          <div className="text-red-400 text-sm p-4">
                            <strong>Error:</strong> {webhookResponse.error}
                          </div>
                        ) : (
                          <div className="w-full h-full">
                            {(() => {
                              let htmlContent = ''
                              
                              // Extract HTML content from various possible response formats
                              const data = webhookResponse.data
                              
                              if (typeof data === 'string') {
                                // If data is a string, check if it's HTML or JSON string
                                if (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html')) {
                                  htmlContent = data
                                } else {
                                  // Try to parse as JSON and extract HTML
                                  try {
                                    const parsed = JSON.parse(data)
                                    htmlContent = parsed.html || parsed.output || data
                                  } catch {
                                    htmlContent = data
                                  }
                                }
                              } else if (typeof data === 'object' && data !== null) {
                                // If data is an object, look for HTML fields
                                htmlContent = data.html || data.output || data.content || JSON.stringify(data, null, 2)
                              } else {
                                htmlContent = String(data)
                              }
                              
                              // If still not HTML, wrap in pre tag with better styling
                              if (!htmlContent.includes('<html') && !htmlContent.includes('<!DOCTYPE')) {
                                htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { 
      font-family: Arial, sans-serif; 
      color: #333; 
      line-height: 1.6; 
      margin: 20px; 
      background: #f9f9f9;
    }
    pre { 
      color: #333; 
      font-family: 'Courier New', monospace; 
      padding: 20px; 
      white-space: pre-wrap; 
      word-wrap: break-word; 
      background: white;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <pre>${htmlContent}</pre>
</body>
</html>`
                              }
                              
                              return (
                                <iframe
                                  srcDoc={htmlContent}
                                  className="w-full h-full border-0"
                                  style={{ height: '100%' }}
                                  sandbox="allow-same-origin"
                                />
                              )
                            })()}
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
