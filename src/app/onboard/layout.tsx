export default function OnboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'inherit' }}>
      {children}
    </div>
  )
}
