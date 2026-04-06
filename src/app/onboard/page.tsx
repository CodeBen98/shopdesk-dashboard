import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'
import { Shop } from '@/types'

export default async function OnboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  let { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  // If no shop row exists (trigger failed), create one now
  if (!shop) {
    const { data: newShop } = await supabase
      .from('shops')
      .insert({ owner_id: user.id, name: '' })
      .select('*')
      .single()
    shop = newShop
  }

  if (shop?.onboarding_complete) {
    redirect('/dashboard')
  }

  return <OnboardingWizard shop={shop as Shop | null} userId={user.id} />
}
