import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getIndustryTemplate } from '@/lib/industries/templates'

export const metadata: Metadata = { title: 'Setup | ShopDesk' }

type SetupTask = {
  title: string
  description: string
  done: boolean
  href: string
  action: string
}

function CheckIcon({ done }: { done: boolean }) {
  return (
    <span style={{
      width: 24,
      height: 24,
      borderRadius: '50%',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: done ? 'var(--success)' : 'rgba(255,255,255,0.06)',
      color: done ? '#04110b' : 'var(--muted)',
      fontSize: 13,
      fontWeight: 800,
      flexShrink: 0,
    }}>
      {done ? '✓' : '·'}
    </span>
  )
}

export default async function DashboardSetupPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: shop } = await supabase
    .from('shops')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!shop) redirect('/dashboard')

  const industry = getIndustryTemplate(shop.industry)
  const tasks: SetupTask[] = [
    {
      title: 'Business details',
      description: 'Name, phone number, address, and contact basics.',
      done: Boolean(shop.name && shop.phone && shop.address),
      href: '/onboard',
      action: 'Add details',
    },
    {
      title: 'Industry',
      description: `Current template: ${industry.label}. This controls services, intake, urgency rules, and AI behavior.`,
      done: Boolean(shop.industry),
      href: '/onboard',
      action: 'Choose industry',
    },
    {
      title: 'Hours and services',
      description: 'Teach the receptionist when you are open and what customers can book.',
      done: Boolean(shop.services?.length),
      href: '/onboard',
      action: 'Add services',
    },
    {
      title: 'Calendar',
      description: 'Connect Google Calendar so ShopDesk can book real appointments.',
      done: Boolean(shop.google_refresh_token),
      href: '/dashboard/settings?tab=integrations',
      action: 'Connect calendar',
    },
    {
      title: 'Voice and AI agent',
      description: 'Pick a voice, provision the AI receptionist, and assign a phone number.',
      done: Boolean(shop.vapi_agent_id && shop.twilio_number),
      href: '/onboard',
      action: 'Set up agent',
    },
    {
      title: 'Test and go live',
      description: 'Call the receptionist, confirm it sounds right, then turn it on.',
      done: Boolean(shop.onboarding_complete),
      href: shop.twilio_number ? `tel:${shop.twilio_number}` : '/onboard',
      action: shop.twilio_number ? 'Test agent' : 'Finish setup',
    },
  ]

  const complete = tasks.filter(task => task.done).length
  const percent = Math.round((complete / tasks.length) * 100)

  return (
    <div style={{ animation: 'fadeIn 0.3s ease', maxWidth: 1120 }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
          Configure
        </p>
        <h1 style={{ fontFamily: 'var(--font-space)', fontSize: 'clamp(1.7rem, 3vw, 2.2rem)', fontWeight: 800, color: 'var(--text)', margin: '0 0 8px', letterSpacing: '-0.6px' }}>
          Set up your AI receptionist
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: 15, lineHeight: 1.6, maxWidth: 680, margin: 0 }}>
          This is the new dashboard-first setup hub. The current auto repair flow stays available while industry templates and configuration pages move into the dashboard.
        </p>
      </div>

      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ color: 'var(--text)', fontSize: 18, margin: '0 0 4px', fontWeight: 800 }}>Setup progress</h2>
            <p style={{ color: 'var(--muted)', fontSize: 14, margin: 0 }}>{complete} of {tasks.length} steps complete</p>
          </div>
          <Link href="/onboard" style={{ color: 'white', background: 'var(--accent)', borderRadius: 10, padding: '10px 14px', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>
            Continue guided setup →
          </Link>
        </div>
        <div style={{ height: 10, background: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
          <div style={{ width: `${percent}%`, height: '100%', background: 'var(--accent)', borderRadius: 999 }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {tasks.map(task => (
          <div key={task.title} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: 18,
            display: 'flex',
            gap: 14,
            alignItems: 'flex-start',
          }}>
            <CheckIcon done={task.done} />
            <div style={{ minWidth: 0 }}>
              <h3 style={{ color: 'var(--text)', fontSize: 15, margin: '0 0 6px', fontWeight: 800 }}>{task.title}</h3>
              <p style={{ color: 'var(--muted)', fontSize: 13, lineHeight: 1.55, margin: '0 0 12px' }}>{task.description}</p>
              <Link href={task.href} style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                {task.done ? 'Review' : task.action} →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
