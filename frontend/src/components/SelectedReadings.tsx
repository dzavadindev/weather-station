import { metrics } from '../consts'
import type { Source } from '../consts'
import { formatDate, formattedValue, nearestReading } from '../readings'
import { Icon } from './Icon'
import { SectionHeading } from './SectionHeading'

export function SelectedReadings({ selectedTime, sources, selectedIds }: {
  selectedTime: number | null
  sources: Source[]
  selectedIds: string[]
}) {
  return (
    <section className="selected-section" aria-live="polite">
      <SectionHeading eyebrow="A MOMENT IN TIME"
        title={selectedTime === null ? 'Pick a point on the graph' : formatDate(selectedTime, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
        description={selectedTime === null ? 'Drag the marker or click the chart to explore readings.' : 'Closest reading for each selected sensor'}
        variant="selected" />
      {selectedTime !== null && sources.filter((source) => selectedIds.includes(source.id)).map((source) => {
        const reading = nearestReading(source.readings, selectedTime)
        return (
          <div className="reading-row" key={source.id}>
            <div className="reading-source">
              <span className="reading-dot" style={{ background: source.color }} />
              {source.name}
              <small>{formatDate(reading.timestamp, { hour: 'numeric', minute: '2-digit' })}</small>
            </div>
            <div className="reading-circles">
              {metrics.map((item) => (
                <div className={`reading-bubble bubble-${item.id}`} key={item.id}>
                  <Icon name={item.id} size={18} />
                  <strong>{formattedValue(reading, item.id)}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}
