import type { User } from '@supabase/supabase-js'

export const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'slarve@shopdesk.site'

export function isAdmin(user: User | null | undefined): boolean {
  return !!user && user.email === ADMIN_EMAIL
}
