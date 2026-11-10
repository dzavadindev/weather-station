import { useEffect, useState } from 'react'
import { fetchReadings, fetchSensors } from './api'
import type { Period, Reading, Sensor } from './consts'

type Result = { key: string; data: Reading[]; error: string | null }
type SensorResult = { key: string; data: Sensor[]; error: string | null }

export function useReadings(period: Period, requestTime: number, retry: number) {
  const historyKey = `${period}:${requestTime}:${retry}`
  const dayKey = `${requestTime}:${retry}`
  const [history, setHistory] = useState<Result>({ key: '', data: [], error: null })
  const [day, setDay] = useState<Result>({ key: '', data: [], error: null })
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
    fetchReadings('day', controller.signal)
      .then((data) => setDay({ key: dayKey, data, error: null }))
      .catch(() => {
        if (!controller.signal.aborted) setDay({ key: dayKey, data: [], error: 'Unable to load latest readings' })
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
    dayReadings: day.key === dayKey ? day.data : [],
    dayError: day.key === dayKey ? day.error : null,
    dayLoading: day.key !== dayKey,
  }
}
