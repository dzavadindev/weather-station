import { useState } from 'react'
import type { CSSProperties } from 'react'
import { metrics } from '../consts'
import type { DaySummary, Sensor } from '../consts'
import { formatDate, formattedValue } from '../readings'
import { Icon } from './Icon'

export function Overview({ sensors, summaries, loading, error }: {
  sensors: Sensor[]
  summaries: DaySummary[]
  loading: boolean
  error: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = sensors.find((sensor) => sensor.uuid === selectedId) ?? sensors[0]
  const selectedIndex = sensors.findIndex((sensor) => sensor.uuid === selected?.uuid)
  const summary = summaries.find((item) => item.uuid === selected?.uuid)
  const values = summary && {
    temperature: summary.average_temperature,
    humidity: summary.average_humidity,
    battery: summary.battery,
  }

  return (
    <>
      <section className="intro">
        <div>
          <p className="eyebrow">YOUR ENVIRONMENT, AT A GLANCE</p>
          <h1>Good to know <span className="heading-sun">✳</span></h1>
          <p className="intro-subtitle">A closer look at the little things happening around you.</p>
        </div>
        <span className="intro-badge"><Icon name="clock" size={17} /> Last 24 hours</span>
      </section>
      <section className="overview" aria-label="Sensor summary for the last 24 hours">
        <fieldset className="overview-picker">
          <legend className="overview-picker-label">VIEW SENSOR</legend>
          {sensors.length ? (
            <div className="overview-picker-scroll">
              <div className="overview-segments" style={{
                '--segment-count': sensors.length,
                '--segment-index': selectedIndex,
              } as CSSProperties}>
                <span className="overview-segment-thumb" aria-hidden="true" />
                {sensors.map((sensor) => (
                  <label className="overview-segment" key={sensor.uuid}>
                    <input type="radio" name="overview-sensor" value={sensor.uuid}
                      checked={selected?.uuid === sensor.uuid} onChange={() => setSelectedId(sensor.uuid)} />
                    <span title={sensor.description}>{sensor.description}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : <p className="overview-picker-empty">{error ? 'Could not load sensors' : loading ? 'Loading sensors…' : 'No sensors registered'}</p>}
        </fieldset>
        <div className="overview-cards">
          {metrics.map((item) => (
            <article className={`stat-card stat-${item.id}`} key={item.id}>
              <div className="stat-top">
                <span className="stat-icon"><Icon name={item.id} /></span>
                <Icon name="arrow" size={18} />
              </div>
              <div>
                <p className="stat-label">{item.label}</p>
                <div className="stat-value">{formattedValue(values, item.id)}</div>
                <p className="stat-caption">{error ? 'Could not load summary' : loading ? 'Loading summary…' : !selected ? 'No sensors registered' : summary ? item.id === 'battery' ? `Last recorded ${formatDate(summary.latest_timestamp, { hour: 'numeric', minute: '2-digit' })}` : 'Average over the last 24 hours' : 'No readings in the last 24 hours'}</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
