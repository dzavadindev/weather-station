import { metrics } from '../consts'
import type { Reading } from '../consts'
import { formatDate, formattedValue } from '../readings'
import { Icon } from './Icon'

export function Overview({ latest, loading, error }: { latest?: Reading; loading: boolean; error: string | null }) {
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
      <section className="overview" aria-label="Latest readings in the last 24 hours">
        {metrics.map((item) => (
          <article className={`stat-card stat-${item.id}`} key={item.id}>
            <div className="stat-top">
              <span className="stat-icon"><Icon name={item.id} /></span>
              <Icon name="arrow" size={18} />
            </div>
            <div>
              <p className="stat-label">{item.label}</p>
              <div className="stat-value">{formattedValue(latest, item.id)}</div>
              <p className="stat-caption">{error ? 'Could not load readings' : loading ? 'Loading readings…' : latest ? `Last recorded ${formatDate(latest.timestamp, { hour: 'numeric', minute: '2-digit' })}` : 'No readings in the last 24 hours'}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}
