import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { isAdmin } from '@/lib/admin'
import type { Shop } from '@/types'

export default async function OnboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')
  if (isAdmin(user)) redirect('/admin')

  let { data: shop } = await supabase
    .from('shops')
    .select('*')
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
      .select('*')
      .single()
    shop = newShop
  }

  if (shop?.onboarding_complete) redirect('/dashboard')

  return <OnboardingWizard shop={shop as Shop | null} userId={user.id} />
}
