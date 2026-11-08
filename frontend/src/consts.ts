export type Metric = 'temperature' | 'humidity' | 'battery'
export type Period = 'day' | 'week' | 'month' | 'all'

export type Reading = {
  temperature: number
  humidity: number
  battery: number
  timestamp: number
  sensor_id?: string
  sensor_name?: string
}

export type Source = { id: string; name: string; color: string; readings: Reading[] }

export const metrics: { id: Metric; label: string; unit: string }[] = [
  { id: 'temperature', label: 'Temperature', unit: '°C' },
  { id: 'humidity', label: 'Humidity', unit: '%' },
  { id: 'battery', label: 'Battery', unit: '%' },
]

export const periods: { id: Period; label: string; duration: number }[] = [
  { id: 'all', label: 'All time', duration: 0 },
  { id: 'month', label: 'Month', duration: 30 * 86_400_000 },
  { id: 'week', label: 'Week', duration: 7 * 86_400_000 },
  { id: 'day', label: 'Day', duration: 86_400_000 },
]

// SVG and legend styles resolve these theme variables from index.scss.
export const sensorColors = [
  'var(--color-sensor-1)',
  'var(--color-sensor-2)',
  'var(--color-sensor-3)',
  'var(--color-sensor-4)',
  'var(--color-sensor-5)',
  'var(--color-sensor-6)',
]

// SVG viewBox coordinates, not CSS pixels. Insets leave room for axis labels.
// The chart scales this coordinate system to its available width and height.
export const plot = { left: 58, right: 20, top: 28, bottom: 49, width: 900, height: 340 }
export const chartWidth = plot.width - plot.left - plot.right
export const chartHeight = plot.height - plot.top - plot.bottom
