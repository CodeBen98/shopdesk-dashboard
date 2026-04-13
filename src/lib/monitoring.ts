import * as Sentry from '@sentry/nextjs'
import { createClient } from '@supabase/supabase-js'

type Severity = 'info' | 'warning' | 'critical'

type MonitoringEvent = {
  shopId?: string | null
  source: string
  eventType: string
  severity?: Severity
  message: string
  payload?: Record<string, unknown> | null
}

function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export async function recordMonitoringEvent(event: MonitoringEvent) {
  const supabase = getServiceSupabase()
  if (!supabase) return

  try {
    await supabase.from('monitoring_events').insert({
      shop_id: event.shopId ?? null,
      source: event.source,
      event_type: event.eventType,
      severity: event.severity ?? 'warning',
      message: event.message,
      payload: event.payload ?? null,
    })
  } catch (error) {
    console.error('recordMonitoringEvent failed:', error)
  }
}

export async function captureAndRecord(params: MonitoringEvent & { error: unknown }) {
  Sentry.captureException(params.error, {
    tags: {
      source: params.source,
      event_type: params.eventType,
      severity: params.severity ?? 'warning',
    },
    extra: params.payload ?? undefined,
  })

  await recordMonitoringEvent({
    shopId: params.shopId,
    source: params.source,
    eventType: params.eventType,
    severity: params.severity,
    message: params.message,
    payload: {
      ...(params.payload ?? {}),
      error: params.error instanceof Error ? params.error.message : String(params.error),
    },
  })
}
