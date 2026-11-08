import type { CSSProperties } from 'react'
import type { Source } from '../consts'

export function SensorLegend({ sources, selectedIds, onToggle }: {
  sources: Source[]
  selectedIds: string[]
  onToggle: (id: string) => void
}) {
  return (
    <aside className="legend">
      <p className="legend-title">SENSORS</p>
      <div className="legend-list">
        {sources.length ? sources.map((source) => {
          const active = selectedIds.includes(source.id)
          return (
            <button type="button" key={source.id} className={`legend-item ${active ? 'chosen' : ''}`}
              style={{ '--source-color': source.color } as CSSProperties}
              aria-label={`${source.name}, ${active ? 'selected' : 'not selected'}`}
              aria-pressed={active} title={source.name} onClick={() => onToggle(source.id)}>
              <span className="legend-name">{source.name}</span>
              <span className="legend-circle" />
            </button>
          )
        }) : <p className="legend-empty">No sensors yet</p>}
      </div>
      <span className="legend-hint">Select to focus</span>
    </aside>
  )
}
