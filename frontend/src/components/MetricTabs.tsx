import { metrics } from '../consts'
import type { Metric } from '../consts'
import { Icon } from './Icon'

export function MetricTabs({ metric, onChange }: { metric: Metric; onChange: (metric: Metric) => void }) {
  return (
    <nav className="metric-tabs" aria-label="Chart metric">
      {metrics.map((item) => (
        <button type="button" key={item.id} className={`metric-tab ${metric === item.id ? 'active' : ''}`}
          aria-label={item.label} aria-current={metric === item.id ? 'true' : undefined}
          title={item.label} onClick={() => onChange(item.id)}>
          <Icon name={item.id} size={22} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  )
}
