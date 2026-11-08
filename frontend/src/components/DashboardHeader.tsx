import { formatDate } from '../readings'
import { Icon } from './Icon'

export function DashboardHeader({ requestTime }: { requestTime: number }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark"><Icon name="activity" size={20} /></span>
        <span>fieldnote<span className="brand-dot">.</span></span>
      </div>
      <div className="topbar-right">
        <span className="live-indicator"><span className="live-dot" /> WEATHER STATION</span>
        <span className="topbar-date">{formatDate(requestTime, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
      </div>
    </header>
  )
}
