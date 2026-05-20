import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IntakeForm } from '@/components/onboarding/IntakeForm'
import { isAdmin } from '@/lib/admin'

export default async function OnboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (isAdmin(user)) redirect('/admin')

  let { data: shop } = await supabase
    .from('shops')
    .select('name, phone, industry, twilio_number, vapi_agent_id, onboarding_complete, enrichment')
    .eq('owner_id', user.id)
    .single()

  if (!shop) {
    const { data: newShop } = await supabase
      .from('shops')
      .insert({ owner_id: user.id, name: '', hours: {
        monday:    { open: true,  from: '09:00', to: '17:00' },
        tuesday:   { open: true,  from: '09:00', to: '17:00' },
        wednesday: { open: true,  from: '09:00', to: '17:00' },
        thursday:  { open: true,  from: '09:00', to: '17:00' },
        friday:    { open: true,  from: '09:00', to: '17:00' },
        saturday:  { open: false, from: '09:00', to: '17:00' },
        sunday:    { open: false, from: '09:00', to: '17:00' },
      }})
      .select('name, phone, industry, twilio_number, vapi_agent_id, onboarding_complete, enrichment')
      .single()
    shop = newShop
  }

  if (shop?.onboarding_complete) redirect('/dashboard')

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '40px 20px',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 4, height: 30, background: 'var(--accent)', borderRadius: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, gap: 2 }}>
            <span style={{ fontFamily: 'var(--font-space)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '0.02em', color: 'var(--text)' }}>SHOP</span>
            <span style={{ fontFamily: 'var(--font-space)', fontWeight: 500, fontSize: '0.78rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>DESK</span>
          </div>
        </div>
      </div>

      <IntakeForm userId={user.id} existingShop={shop} />
    </div>
  )
}
