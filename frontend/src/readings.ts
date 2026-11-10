import { sensorColors } from './consts'
import type { Metric, Reading, Sensor, Source } from './consts'

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

export function selectedSourceIds(selectedIds: string[] | null, sources: Source[]): string[] {
  return (selectedIds ?? sources.map((source) => source.id))
    .filter((id) => sources.some((source) => source.id === id))
}

export function toggleSelectedSource(selectedIds: string[] | null, sources: Source[], id: string): string[] {
  const current = selectedSourceIds(selectedIds, sources)
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
}

export function groupSources(readings: Reading[], sensors: Sensor[]): Source[] {
  const grouped = new Map<string, Source>()
  const names = new Map(sensors.map((sensor) => [sensor.uuid, sensor.description]))
  for (const reading of readings) {
    const id = reading.uuid
    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        name: names.get(id) ?? `Sensor ${id}`,
        color: sensorColors[grouped.size % sensorColors.length],
        readings: [],
      })
    }
    grouped.get(id)!.readings.push(reading)
  }
  return [...grouped.values()]
}
