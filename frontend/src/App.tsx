import { useMemo, useState } from 'react'
import type { Metric, Period } from './consts'
import { ChartPanel } from './components/ChartPanel'
import { DashboardHeader } from './components/DashboardHeader'
import { Overview } from './components/Overview'
import { SelectedReadings } from './components/SelectedReadings'
import { groupSources, selectedSourceIds, toggleSelectedSource } from './readings'
import { useReadings } from './useReadings'
import './App.scss'

function App() {
  const [metric, setMetric] = useState<Metric>('temperature')
  const [period, setPeriod] = useState<Period>('day')
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null)
  const [selectedTime, setSelectedTime] = useState<number | null>(null)
  const [requestTime, setRequestTime] = useState(() => Date.now())
  const [retry, setRetry] = useState(0)
  const { readings, sensors, sensorsLoading, sensorsError, dayReadings, dayError, dayLoading, loading, error } = useReadings(period, requestTime, retry)
  const sources = useMemo(() => groupSources(readings, sensors), [readings, sensors])
  const activeIds = selectedSourceIds(selectedIds, sources)

  function changePeriod(next: Period) {
    if (next === period) return
    setPeriod(next)
    setSelectedTime(null)
  }

  function toggleSensor(id: string) {
    setSelectedIds((ids) => toggleSelectedSource(ids, sources, id))
  }

  function retryRequest() {
    setRequestTime(Date.now())
    setRetry((count) => count + 1)
  }

  return (
    <main className="dashboard">
      <DashboardHeader requestTime={requestTime} />
      <Overview sensors={sensors} readings={dayReadings}
        loading={dayLoading || sensorsLoading} error={dayError ?? sensorsError} />
      <ChartPanel metric={metric} onMetricChange={setMetric} period={period} onPeriodChange={changePeriod}
        requestTime={requestTime} readings={readings} sources={sources} selectedIds={activeIds}
        onToggleSensor={toggleSensor} selectedTime={selectedTime} onSelectTime={setSelectedTime}
        loading={loading} error={error} onRetry={retryRequest} />
      <SelectedReadings selectedTime={selectedTime} sources={sources} selectedIds={activeIds} />
      <footer><span>fieldnote<span className="brand-dot">.</span></span><span>Small details. Better understanding.</span></footer>
    </main>
  )
}

export default App
