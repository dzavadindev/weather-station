import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import App from '../src/App'

const sensors = [
  { uuid: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', description: 'Bathroom' },
  { uuid: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb', description: 'Balcony' },
]
const readings = sensors.map((sensor, index) => ({
  uuid: sensor.uuid, temperature: 24 - index * 16, humidity: 0.48 - index * 0.1,
  battery: 0.9, timestamp: Date.now() - 60_000,
}))
const summaries = sensors.map((sensor, index) => ({
  uuid: sensor.uuid, average_temperature: 23.5 - index * 16,
  average_humidity: 0.46 - index * 0.1, battery: 0.82 - index * 0.08,
  latest_timestamp: readings[index].timestamp,
}))

function mockApi(availableSensors = sensors, availableReadings = readings, availableSummaries = summaries) {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const data = url === '/api/sensor/' ? availableSensors
      : url === '/api/sensor/data/today' ? availableSummaries
      : url === '/api/sensor/data?period=day' ? availableReadings : null
    if (data === null) throw new Error(`Unexpected request: ${url}`)
    return Promise.resolve({ ok: true, json: async () => data })
  }))
}

beforeEach(() => mockApi())

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

async function loadDashboard() {
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('button', { name: 'Bathroom, selected' })
  expect(screen.getByRole('button', { name: 'Balcony, selected' })).toBeInTheDocument()
  expect(document.querySelectorAll('path.data-line')).toHaveLength(2)
  return user
}

async function pickReading(user: ReturnType<typeof userEvent.setup>) {
  screen.getByRole('slider', { name: 'Select reading date' }).focus()
  await user.keyboard('{End}')
}

function lines() {
  return document.querySelectorAll('path.data-line')
}

function selectedReadings() {
  return document.querySelectorAll('.reading-row')
}

test('Overview defaults to Bathroom and switches its cards to Balcony without changing chart selection', async () => {
  const user = await loadDashboard()
  const overview = screen.getByRole('region', { name: 'Sensor summary for the last 24 hours' })
  expect(screen.getByRole('radio', { name: 'Bathroom' })).toBeChecked()
  expect(within(overview).getByText('23.5°C')).toBeInTheDocument()
  expect(within(overview).getByText('46.0%')).toBeInTheDocument()
  expect(within(overview).getByText('82.0%')).toBeInTheDocument()
  expect(within(overview).getAllByText('Average over the last 24 hours')).toHaveLength(2)
  expect(within(overview).getByText(/Last recorded/)).toBeInTheDocument()

  await user.click(screen.getByRole('radio', { name: 'Balcony' }))
  expect(screen.getByRole('radio', { name: 'Balcony' })).toBeChecked()
  expect(screen.getByRole('radio', { name: 'Bathroom' })).not.toBeChecked()
  expect(within(overview).getByText('7.5°C')).toBeInTheDocument()
  expect(within(overview).getByText('36.0%')).toBeInTheDocument()
  expect(within(overview).getByText('74.0%')).toBeInTheDocument()
  expect(within(overview).queryByText('23.5°C')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Bathroom, selected' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Balcony, selected' })).toBeInTheDocument()

  screen.getByRole('radio', { name: 'Balcony' }).focus()
  await user.keyboard('{ArrowLeft}')
  expect(screen.getByRole('radio', { name: 'Bathroom' })).toBeChecked()
  expect(within(overview).getByText('23.5°C')).toBeInTheDocument()
})

test('Overview shows an empty state when the chosen sensor has no recent readings', async () => {
  mockApi(sensors, [readings[0]], [summaries[0]])
  const user = userEvent.setup()
  render(<App />)
  await screen.findByRole('radio', { name: 'Balcony' })
  await user.click(screen.getByRole('radio', { name: 'Balcony' }))
  const overview = screen.getByRole('region', { name: 'Sensor summary for the last 24 hours' })
  expect(within(overview).getAllByText('No readings in the last 24 hours')).toHaveLength(3)
  expect(within(overview).getAllByText('—')).toHaveLength(3)
})

test('Overview handles a station without registered sensors', async () => {
  mockApi([], [], [])
  render(<App />)
  const overview = screen.getByRole('region', { name: 'Sensor summary for the last 24 hours' })
  await within(overview).findByText('No sensors registered', { selector: '.overview-picker-empty' })
  expect(within(overview).queryAllByRole('radio')).toHaveLength(0)
})

test('both sensors are selected by default and both readings appear when a time is picked', async () => {
  const user = await loadDashboard()
  expect(lines()[0]).not.toHaveClass('dimmed')
  expect(lines()[1]).not.toHaveClass('dimmed')
  await pickReading(user)
  expect(selectedReadings()).toHaveLength(2)
  expect(selectedReadings()[0]).toHaveTextContent('Bathroom')
  expect(selectedReadings()[1]).toHaveTextContent('Balcony')
})

test.each([
  ['Balcony', 'Bathroom', 1],
  ['Bathroom', 'Balcony', 0],
])('deselecting %s dims only its line and shows %s readings', async (deselected: string, selected: string, dimmedIndex: number) => {
  const user = await loadDashboard()
  await user.click(screen.getByRole('button', { name: `${deselected}, selected` }))
  expect(screen.getByRole('button', { name: `${deselected}, not selected` })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: `${selected}, selected` })).toHaveAttribute('aria-pressed', 'true')
  expect(lines()[dimmedIndex]).toHaveClass('dimmed')
  expect(lines()[1 - dimmedIndex]).not.toHaveClass('dimmed')
  await pickReading(user)
  expect(selectedReadings()).toHaveLength(1)
  expect(within(selectedReadings()[0] as HTMLElement).getByText(selected)).toBeInTheDocument()
})

test('deselecting both keeps both lines undimmed without selected readings', async () => {
  const user = await loadDashboard()
  await user.click(screen.getByRole('button', { name: 'Bathroom, selected' }))
  await user.click(screen.getByRole('button', { name: 'Balcony, selected' }))
  expect(screen.getByRole('button', { name: 'Bathroom, not selected' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByRole('button', { name: 'Balcony, not selected' })).toHaveAttribute('aria-pressed', 'false')
  expect(lines()[0]).not.toHaveClass('dimmed')
  expect(lines()[1]).not.toHaveClass('dimmed')
  await pickReading(user)
  expect(selectedReadings()).toHaveLength(0)
  expect(document.querySelectorAll('circle.selection-point')).toHaveLength(0)
  await user.click(screen.getByRole('button', { name: 'Balcony, not selected' }))
  expect(screen.getByRole('button', { name: 'Balcony, selected' })).toHaveAttribute('aria-pressed', 'true')
  expect(selectedReadings()).toHaveLength(1)
  expect(selectedReadings()[0]).toHaveTextContent('Balcony')
})
