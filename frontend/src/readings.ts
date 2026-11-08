import { sensorColors } from './consts'
import type { Metric, Reading, Source } from './consts'

export function valueOf(reading: Reading, metric: Metric) {
  return metric === 'temperature' ? reading.temperature : reading[metric] * 100
}

export function formattedValue(reading: Reading | undefined, metric: Metric) {
  if (!reading) return '—'
  return `${valueOf(reading, metric).toFixed(1)}${metric === 'temperature' ? '°' : '%'}${metric === 'temperature' ? 'C' : ''}`
}

export function formatDate(timestamp: number, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(undefined, options).format(timestamp)
}

export function nearestReading(readings: Reading[], time: number) {
  return readings.reduce((nearest, reading) =>
    Math.abs(reading.timestamp - time) < Math.abs(nearest.timestamp - time) ? reading : nearest,
  )
}

export function groupSources(readings: Reading[]): Source[] {
  const grouped = new Map<string, Source>()
  for (const reading of readings) {
    const id = reading.sensor_id == null ? 'station' : String(reading.sensor_id)
    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        name: reading.sensor_name || (id === 'station' ? 'Weather station' : `Sensor ${id}`),
        color: sensorColors[grouped.size % sensorColors.length],
        readings: [],
      })
    }
    grouped.get(id)!.readings.push(reading)
  }
  return [...grouped.values()]
}
