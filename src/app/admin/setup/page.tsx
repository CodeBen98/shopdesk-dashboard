import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { isAdmin } from '@/lib/admin'
import type { Shop } from '@/types'

// Admin-only access to the full onboarding wizard.
// Use this for demos, advanced config, and manual shop setup.
export default async function AdminSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (!isAdmin(user)) redirect('/dashboard')

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>Admin: Onboarding Wizard</span>
        <a href="/admin" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Back to admin</a>
      </div>
      <OnboardingWizard shop={shop as Shop | null} userId={user.id} />
    </div>
  )
}
