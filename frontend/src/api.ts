import type { Reading } from './consts'

export async function fetchReadings(from: number, to: number, signal: AbortSignal): Promise<Reading[]> {
  const response = await fetch(`/api/sensor-data?from=${Math.max(0, from)}&to=${to}`, { signal })
  if (!response.ok) throw new Error(`Request failed (${response.status})`)
  const data: Reading[] = await response.json()
  return data
    .filter((reading) =>
      Number.isFinite(reading.timestamp) && Number.isFinite(reading.temperature) &&
      Number.isFinite(reading.humidity) && Number.isFinite(reading.battery),
    )
    .sort((a, b) => a.timestamp - b.timestamp)
}
