import type { Metric } from '../consts'

type IconName = Metric | 'activity' | 'clock' | 'calendar' | 'arrow'

export function Icon({ name, size = 24 }: { name: IconName; size?: number }) {
  const common = {
    width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  switch (name) {
    case 'temperature': return <svg {...common}><path d="M10 14.5V5a2 2 0 0 1 4 0v9.5a4 4 0 1 1-4 0Z" /><path d="M12 10v7" /></svg>
    case 'humidity': return <svg {...common}><path d="M12 2C9 6.5 5 10 5 15a7 7 0 0 0 14 0c0-5-4-8.5-7-13Z" /><path d="M9 16a3 3 0 0 0 3 3" /></svg>
    case 'battery': return <svg {...common}><rect x="2" y="7" width="18" height="10" rx="2" /><path d="M22 10v4M6 10v4m4-4v4m4-4v4" /></svg>
    case 'activity': return <svg {...common}><path d="M2 12h4l3-7 5 14 3-7h5" /></svg>
    case 'clock': return <svg {...common}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
    case 'calendar': return <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></svg>
    case 'arrow': return <svg {...common}><path d="m7 17 10-10M8 7h9v9" /></svg>
  }
}
