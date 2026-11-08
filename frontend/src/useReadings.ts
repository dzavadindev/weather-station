import { useEffect, useState } from 'react'
import { fetchReadings } from './api'
import { periods } from './consts'
import type { Period, Reading } from './consts'

type Result = { key: string; data: Reading[]; error: string | null }

export function useReadings(period: Period, requestTime: number, retry: number) {
  const historyKey = `${period}:${requestTime}:${retry}`
  const dayKey = `${requestTime}:${retry}`
  const [history, setHistory] = useState<Result>({ key: '', data: [], error: null })
  const [day, setDay] = useState<Result>({ key: '', data: [], error: null })

  useEffect(() => {
    const controller = new AbortController()
    const duration = periods.find((item) => item.id === period)!.duration
    fetchReadings(duration ? requestTime - duration : 0, requestTime, controller.signal)
      .then((data) => setHistory({ key: historyKey, data, error: null }))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setHistory({ key: historyKey, data: [], error: reason instanceof Error ? reason.message : 'Unable to load readings' })
      })
    return () => controller.abort()
  }, [period, requestTime, historyKey])

  useEffect(() => {
    const controller = new AbortController()
    fetchReadings(requestTime - 86_400_000, requestTime, controller.signal)
      .then((data) => setDay({ key: dayKey, data, error: null }))
      .catch(() => {
        if (!controller.signal.aborted) setDay({ key: dayKey, data: [], error: 'Unable to load latest readings' })
      })
    return () => controller.abort()
  }, [requestTime, dayKey])

  return {
    readings: history.key === historyKey ? history.data : [],
    loading: history.key !== historyKey,
    error: history.key === historyKey ? history.error : null,
    latest: day.key === dayKey ? day.data.at(-1) : undefined,
    dayError: day.key === dayKey ? day.error : null,
    dayLoading: day.key !== dayKey,
  }
}
