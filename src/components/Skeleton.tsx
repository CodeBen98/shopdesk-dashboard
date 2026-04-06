interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
}

export function Skeleton({ width = '100%', height = 16, borderRadius = 6 }: SkeletonProps) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, var(--surface) 0px, var(--card-raised) 200px, var(--surface) 400px)',
        backgroundSize: '800px 100%',
        animation: 'shimmer 1.6s infinite linear',
        flexShrink: 0,
      }}
    />
  )
}

export function SkeletonText({ lines = 1, gap = 8 }: { lines?: number; gap?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === lines - 1 && lines > 1 ? '70%' : '100%'} height={14} />
      ))}
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px 24px',
    }}>
      <Skeleton width={100} height={12} borderRadius={4} />
      <div style={{ marginTop: 10 }}>
        <Skeleton width={60} height={32} borderRadius={6} />
      </div>
      <div style={{ marginTop: 8 }}>
        <Skeleton width={80} height={10} borderRadius={4} />
      </div>
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr 1fr 80px 60px',
      gap: 16,
      alignItems: 'center',
      padding: '14px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <Skeleton height={14} borderRadius={4} />
      <Skeleton height={14} borderRadius={4} />
      <Skeleton height={14} borderRadius={4} />
      <Skeleton width={60} height={22} borderRadius={20} />
      <Skeleton width={40} height={14} borderRadius={4} />
    </div>
  )
}
