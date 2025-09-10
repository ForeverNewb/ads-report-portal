
export interface WebhookPayload {
  client: string | null
  channels: string[] | null
  dateRange: {
    start: string | null
    end: string | null
  }
  comparison?: {
    start: string | null
    end: string | null
  } | null
  fileName: string | null
  timestamp: string
}

export interface WebhookResponse {
  success: boolean
  data: any
  status: number
  statusText: string
}

export interface FormData {
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

export interface ApiError {
  error: string
  details?: any
}

export type ResponseStatus = 'success' | 'error' | null

export interface ToastMessage {
  title: string
  description: string
  variant?: 'default' | 'destructive'
}
