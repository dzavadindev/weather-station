import { useEffect, useState } from 'react'
import { fetchReadings, fetchSensors, fetchTodaySummaries } from './api'
import type { DaySummary, Period, Reading, Sensor } from './consts'

type Result<T> = { key: string; data: T[]; error: string | null }
type SensorResult = { key: string; data: Sensor[]; error: string | null }

export function useReadings(period: Period, requestTime: number, retry: number) {
  const historyKey = `${period}:${requestTime}:${retry}`
  const dayKey = `${requestTime}:${retry}`
  const [history, setHistory] = useState<Result<Reading>>({ key: '', data: [], error: null })
  const [day, setDay] = useState<Result<DaySummary>>({ key: '', data: [], error: null })
  const [catalog, setCatalog] = useState<SensorResult>({ key: '', data: [], error: null })

  useEffect(() => {
    const controller = new AbortController()
    fetchReadings(period, controller.signal)
      .then((data) => setHistory({ key: historyKey, data, error: null }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setHistory({ key: historyKey, data: [], error: reason instanceof Error ? reason.message : 'Unable to load readings' })
      })
    return () => controller.abort()
  }, [period, requestTime, historyKey])

  useEffect(() => {
    const controller = new AbortController()
    fetchTodaySummaries(controller.signal)
      .then((data) => setDay({ key: dayKey, data, error: null }))
      .catch(() => {
        if (!controller.signal.aborted) setDay({ key: dayKey, data: [], error: 'Unable to load today’s summary' })
      })
    return () => controller.abort()
  }, [requestTime, dayKey])

  useEffect(() => {
    const controller = new AbortController()
    fetchSensors(controller.signal)
      .then((data) => setCatalog({ key: dayKey, data, error: null }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setCatalog({ key: dayKey, data: [], error: reason instanceof Error ? reason.message : 'Unable to load sensors' })
      })
    return () => controller.abort()
  }, [dayKey])

  return {
    readings: history.key === historyKey ? history.data : [],
    sensors: catalog.key === dayKey ? catalog.data : [],
    sensorsLoading: catalog.key !== dayKey,
    sensorsError: catalog.key === dayKey ? catalog.error : null,
    loading: history.key !== historyKey,
    error: history.key === historyKey ? history.error : null,
    daySummaries: day.key === dayKey ? day.data : [],
    dayError: day.key === dayKey ? day.error : null,
    dayLoading: day.key !== dayKey,
  }
}
