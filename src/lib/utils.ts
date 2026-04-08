import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

// All times displayed in Eastern time (shop timezone)
const TZ = 'America/New_York'

export function formatDate(date: string | Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', timeZone: TZ,
  }).format(new Date(date))
}

export function formatTime(date: string | Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ,
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date | null): string {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
    timeZone: TZ,
  }).format(new Date(date))
}

export function formatDuration(seconds: number | null): string {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const DEFAULT_SHOP_HOURS = {
  monday:    { open: true,  from: "09:00", to: "17:00" },
  tuesday:   { open: true,  from: "09:00", to: "17:00" },
  wednesday: { open: true,  from: "09:00", to: "17:00" },
  thursday:  { open: true,  from: "09:00", to: "17:00" },
  friday:    { open: true,  from: "09:00", to: "17:00" },
  saturday:  { open: false, from: "09:00", to: "17:00" },
  sunday:    { open: false, from: "09:00", to: "17:00" },
}
