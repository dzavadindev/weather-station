import type { DaySummary, Period, Reading, Sensor } from './consts'

export async function fetchSensors(signal: AbortSignal): Promise<Sensor[]> {
  const response = await fetch('/api/sensor/', { signal })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<Sensor[]>
}

export async function fetchTodaySummaries(signal: AbortSignal): Promise<DaySummary[]> {
  const response = await fetch('/api/sensor/data/today', { signal })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  return response.json() as Promise<DaySummary[]>
}

export async function fetchReadings(period: Period, signal: AbortSignal): Promise<Reading[]> {
  const response = await fetch(`/api/sensor/data?period=${period}`, { signal })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  const data: Reading[] = await response.json()
  return data
    .filter((reading) =>
      typeof reading.uuid === 'string' && Number.isFinite(reading.timestamp) && Number.isFinite(reading.temperature) &&
      Number.isFinite(reading.humidity) && Number.isFinite(reading.battery),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
}
