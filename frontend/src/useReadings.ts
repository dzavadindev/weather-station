import { useEffect, useState } from 'react'
import { fetchReadings, fetchSensors } from './api'
import type { Period, Reading, Sensor } from './consts'

type Result = { key: string; data: Reading[]; error: string | null }
type HistoryResult = Result & { sensors: Sensor[] }

export function useReadings(period: Period, requestTime: number, retry: number) {
  const historyKey = `${period}:${requestTime}:${retry}`
  const dayKey = `${requestTime}:${retry}`
  const [history, setHistory] = useState<HistoryResult>({ key: '', data: [], sensors: [], error: null })
  const [day, setDay] = useState<Result>({ key: '', data: [], error: null })

  useEffect(() => {
    const controller = new AbortController()
    Promise.all([fetchReadings(period, controller.signal), fetchSensors(controller.signal)])
      .then(([data, sensors]) => setHistory({ key: historyKey, data, sensors, error: null }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setHistory({ key: historyKey, data: [], sensors: [], error: reason instanceof Error ? reason.message : 'Unable to load readings' })
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

  return {
    readings: history.key === historyKey ? history.data : [],
    sensors: history.key === historyKey ? history.sensors : [],
    loading: history.key !== historyKey,
    error: history.key === historyKey ? history.error : null,
    latest: day.key === dayKey ? day.data.at(-1) : undefined,
    dayError: day.key === dayKey ? day.error : null,
    dayLoading: day.key !== dayKey,
  }
}
