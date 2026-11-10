import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { chartHeight, chartWidth, plot } from '../consts'
import type { Metric, Period, Reading, Source } from '../consts'
import { formatDate, nearestReading, valueOf } from '../readings'

type Props = {
  /** Field to plot; humidity and battery are converted from fractions to percentages. */
  metric: Metric
  /** Controls whether X-axis labels show hours (day) or calendar dates. */
  period: Period
  /** Chronological readings grouped by sensor, used to draw one line per source. */
  sources: Source[]
  /** All readings in the chosen range, used for axis bounds and date selection. */
  readings: Reading[]
  /** Sensor IDs focused in the legend; other lines are dimmed. */
  selectedIds: string[]
  /** Unix timestamp in milliseconds, snapped to a real reading; null hides the marker. */
  selectedTime: number | null
  /** Reports the timestamp picked by a click, drag, or keyboard action to the parent. */
  onSelectTime: (time: number) => void
  /** Beginning of the visible X-axis window, in Unix milliseconds. */
  start: number
  /** End of the visible X-axis window, in Unix milliseconds. */
  end: number
  /** Displays a loading overlay while range readings are being fetched. */
  loading: boolean
  /** Range request error, if any; displayed with the retry action. */
  error: string | null
  /** Retries the failed range request through the parent. */
  onRetry: () => void
}

export function ChartPlot({ metric, period, sources, readings, selectedIds, selectedTime, onSelectTime, start, end, loading, error, onRetry }: Props) {
  const chartRef = useRef<HTMLDivElement>(null)

  // The X axis is a time interval in milliseconds. Guard against a zero-length
  // interval (e.g. a single "all time" reading) before dividing by it.
  const span = Math.max(end - start, 1)

  // Only the active metric affects the Y axis. valueOf converts humidity and
  // battery from the API's 0–1 fractions into the 0–100 percentages shown here.
  const values = readings.map((reading) => valueOf(reading, metric))
  const low = values.reduce((min, value) => Math.min(min, value), Infinity)
  const high = values.reduce((max, value) => Math.max(max, value), -Infinity)

  // An empty range needs a visible placeholder scale. Add at least a little
  // breathing room so a constant series does not collapse the Y axis.
  const yLow = Number.isFinite(low) ? low : 0
  const yHigh = Number.isFinite(high) ? high : (metric === 'temperature' ? 30 : 100)
  const padding = Math.max((yHigh - yLow) * 0.15, metric === 'temperature' ? 2 : 5)
  const yMin = yLow - padding
  const yMax = yHigh + padding

  // Map data into the inset plot rectangle inside the SVG viewBox. SVG Y grows
  // downward, so subtracting from yMax puts larger readings nearer the top.
  const xFor = (time: number) => plot.left + (time - start) / span * chartWidth
  const yFor = (value: number) => plot.top + (yMax - value) / (yMax - yMin) * chartHeight
  const selectedX = selectedTime === null ? null : xFor(Math.max(start, Math.min(end, selectedTime)))

  function selectAt(clientX: number) {
    if (!chartRef.current || !readings.length) return
    const rect = chartRef.current.getBoundingClientRect()

    // Convert the pointer's screen pixel to an SVG X coordinate. The interaction
    // overlay fills the entire SVG, but only the inset chartWidth contains data.
    const svgX = (clientX - rect.left) / rect.width * plot.width
    const plotFraction = Math.max(0, Math.min(1, (svgX - plot.left) / chartWidth))
    const targetTime = start + plotFraction * span

    // Snap to an actual reading rather than interpolating a value that was never measured.
    onSelectTime(nearestReading(readings, targetTime).timestamp)
  }

  function handlePointer(event: PointerEvent<HTMLDivElement>) {
    if (!readings.length) return
    // Continue receiving pointer moves while dragging, even outside the chart.
    event.currentTarget.setPointerCapture(event.pointerId)
    selectAt(event.clientX)
  }

  function handleKey(key: string) {
    if (!readings.length) return
    // Multiple sensors can share a timestamp: step through distinct dates only.
    const timestamps = [...new Set(readings.map((reading) => reading.timestamp))]
    const index = selectedTime === null ? timestamps.length - 1 : timestamps.indexOf(selectedTime)
    if (key === 'ArrowLeft' || key === 'ArrowRight') {
      const next = index + (key === 'ArrowLeft' ? -1 : 1)
      onSelectTime(timestamps[Math.max(0, Math.min(timestamps.length - 1, next))])
    }
    if (key === 'Home') onSelectTime(timestamps[0])
    if (key === 'End') onSelectTime(timestamps.at(-1)!)
  }

  return (
    <div className="plot-wrap">
      {/* Stretching the viewBox matches the full-size pointer overlay; SVG coordinates remain fixed while the chart's CSS dimensions change responsively. */}
      <svg className="plot-svg" viewBox={`0 0 ${plot.width} ${plot.height}`} preserveAspectRatio="none" role="img" aria-label={`${metric} over time`}>

        {/* Five evenly spaced horizontal grid lines and their Y-value labels. */}
        {[0, 1, 2, 3, 4].map((tick) => {
          const y = plot.top + tick / 4 * chartHeight
          return (
            <g key={tick}>
              <line className="grid-line" x1={plot.left} x2={plot.width - plot.right} y1={y} y2={y} />
              <text className="axis-label" x={plot.left - 13} y={y + 4} textAnchor="end">
                {(yMax - tick / 4 * (yMax - yMin)).toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Five evenly spaced time labels; day uses hours, longer ranges use dates. */}
        {[0, 1, 2, 3, 4].map((tick) => (
          <text className="axis-label" key={tick} x={plot.left + tick / 4 * chartWidth}
            y={plot.height - 13} textAnchor={tick === 0 ? 'start' : tick === 4 ? 'end' : 'middle'}>
            {formatDate(start + tick / 4 * span, period === 'day' ? { hour: 'numeric' } : { month: 'short', day: 'numeric' })}
          </text>
        ))}

        {/* One polyline per sensor: M starts the path, L joins later samples. A focused legend item fades the others; none selected leaves all lines undimmed. */}
        {sources.map((source) => (
          <path key={source.id} className={`data-line ${selectedIds.length && !selectedIds.includes(source.id) ? 'dimmed' : ''}`}
            stroke={source.color} d={source.readings.map((reading, index) =>
              `${index ? 'L' : 'M'} ${xFor(reading.timestamp).toFixed(2)} ${yFor(valueOf(reading, metric)).toFixed(2)}`,
            ).join(' ')} />
        ))}

        {/* The vertical line marks the chosen time. Each dot is placed at that sensor's nearest real sample, which may not lie exactly on the line. */}
        {selectedX !== null && <>
          <line className="selection-line" x1={selectedX} x2={selectedX} y1={plot.top} y2={plot.top + chartHeight} />
          <circle className="selection-anchor" cx={selectedX} cy={plot.top} r="7" />
          {sources.filter((source) => selectedIds.includes(source.id)).map((source) => {
            const reading = nearestReading(source.readings, selectedTime!)
            return <circle className="selection-point" key={source.id} cx={xFor(reading.timestamp)}
              cy={yFor(valueOf(reading, metric))} r="5" fill={source.color} />
          })}
        </>}
      </svg>

      {/* Transparent pointer/keyboard layer above the SVG. It owns selection; The SVG paths and dots themselves do not handle pointer events. */}
      <div ref={chartRef} className="chart-interaction" role="slider" tabIndex={readings.length ? 0 : -1}
        aria-label="Select reading date" aria-valuemin={start} aria-valuemax={end}
        aria-valuenow={selectedTime ?? undefined}
        aria-valuetext={selectedTime === null ? 'No date selected' : formatDate(selectedTime, { dateStyle: 'medium', timeStyle: 'short' })}
        onPointerDown={handlePointer} onPointerMove={(event) => { if (event.buttons) selectAt(event.clientX) }}
        onKeyDown={(event) => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); handleKey(event.key) } }} />

      {/* The CSS notch tracks the same SVG X position as the vertical line. */}
      {selectedX !== null && <span className="notch" style={{ left: `${selectedX / plot.width * 100}%` }} aria-hidden="true" />}
      {loading && <div className="chart-message">Loading readings…</div>}
      {!loading && error && <div className="chart-message error">{error}. <button type="button" onClick={onRetry}>Try again</button></div>}
      {!loading && !error && !readings.length && <div className="chart-message">No readings for this time range.</div>}
    </div>
  )
}
