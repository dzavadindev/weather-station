import { metrics, periods } from '../consts'
import type { Metric, Period, Reading, Source } from '../consts'
import { Icon } from './Icon'
import { ChartPlot } from './ChartPlot'
import { MetricTabs } from './MetricTabs'
import { SectionHeading } from './SectionHeading'
import { SensorLegend } from './SensorLegend'

type Props = {
  metric: Metric
  onMetricChange: (metric: Metric) => void
  period: Period
  onPeriodChange: (period: Period) => void
  requestTime: number
  readings: Reading[]
  sources: Source[]
  selectedIds: string[]
  onToggleSensor: (id: string) => void
  selectedTime: number | null
  onSelectTime: (time: number) => void
  loading: boolean
  error: string | null
  onRetry: () => void
}

export function ChartPanel({ metric, onMetricChange, period, onPeriodChange, requestTime, readings, sources, selectedIds, onToggleSensor, selectedTime, onSelectTime, loading, error, onRetry }: Props) {
  const duration = periods.find((item) => item.id === period)!.duration
  // Fixed windows end at requestTime; "all" spans the first through last available reading.
  const start = duration ? requestTime - duration : (readings[0]?.timestamp ?? requestTime - 86_400_000)
  const end = duration ? requestTime : (readings.at(-1)?.timestamp ?? requestTime)
  const currentMetric = metrics.find((item) => item.id === metric)!

  return (
    <section className="explore" aria-labelledby="explore-title">
      <SectionHeading eyebrow="EXPLORE THE DATA" title="The bigger picture"
        description="Trace the changes. Find the patterns." id="explore-title" />
      <div className="chart-card">
        <div className="chart-header">
          <div>
            <span className="chart-kicker">HISTORICAL READINGS</span>
            <h3>{currentMetric.label} <span className="chart-unit">/ {currentMetric.unit}</span></h3>
          </div>
          <span className="chart-range"><Icon name="calendar" size={16} />
            {period === 'all' ? 'All available data' : `Past ${period === 'day' ? '24 hours' : period === 'week' ? '7 days' : '30 days'}`}
          </span>
        </div>
        <div className="chart-layout">
          <MetricTabs metric={metric} onChange={onMetricChange} />
          <div className="chart-main">
            <ChartPlot metric={metric} period={period} sources={sources} readings={readings}
              selectedIds={selectedIds} selectedTime={selectedTime} onSelectTime={onSelectTime}
              start={start} end={end} loading={loading} error={error} onRetry={onRetry} />
            <div className="period-row">
              <span className="period-label">TIME RANGE</span>
              <div className="period-options">
                {periods.map((item) => (
                  <button type="button" key={item.id} className={period === item.id ? 'selected' : ''}
                    aria-pressed={period === item.id} onClick={() => onPeriodChange(item.id)}>{item.label}</button>
                ))}
              </div>
            </div>
          </div>
          <SensorLegend sources={sources} selectedIds={selectedIds} onToggle={onToggleSensor} />
        </div>
      </div>
    </section>
  )
}
