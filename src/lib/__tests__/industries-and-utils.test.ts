import { describe, expect, it } from 'vitest'
import { getIndustryTemplate, normalizeIndustry } from '@/lib/industries/templates'
import { formatDuration } from '@/lib/utils'
import { isAdmin, ADMIN_EMAIL } from '@/lib/admin'
import type { User } from '@supabase/supabase-js'

describe('industry templates', () => {
  it('keeps known industries and falls back to "other"', () => {
    expect(normalizeIndustry('hvac')).toBe('hvac')
    expect(normalizeIndustry('not-a-real-industry')).toBe('other')
    expect(normalizeIndustry(null)).toBe('other')
  })

  it('always returns a usable template', () => {
    const t = getIndustryTemplate('unknown')
    expect(t.intakeFields.length).toBeGreaterThan(0)
    expect(t.promptSection.length).toBeGreaterThan(0)
  })
})

describe('formatDuration', () => {
  it('formats call lengths as m:ss', () => {
    expect(formatDuration(125)).toBe('2:05')
    expect(formatDuration(59)).toBe('0:59')
  })
  it('shows a dash when there is no duration', () => {
    expect(formatDuration(null)).toBe('—')
    expect(formatDuration(0)).toBe('—')
  })
})

describe('isAdmin', () => {
  it('only allows the configured admin email', () => {
    expect(isAdmin({ email: ADMIN_EMAIL } as User)).toBe(true)
    expect(isAdmin({ email: 'someone@else.com' } as User)).toBe(false)
    expect(isAdmin(null)).toBe(false)
  })
})
