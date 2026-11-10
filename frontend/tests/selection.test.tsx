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

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn((url: string) => {
    const data = url === '/api/sensor/' ? sensors : url === '/api/sensor/data?period=day' ? readings : null
    if (data === null) throw new Error(`Unexpected request: ${url}`)
    return Promise.resolve({ ok: true, json: async () => data })
  }))
})

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
