import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { reportWarning } from '@/lib/sentry'
import { getJsDayOfWeek, jsToDbDayOfWeek } from '@/utils/dateUtils'

// Seçili tarihte fiilen geçerli olan sabit müşteri slotu.
// slot_time, varsa o tarihe özel istisna saatiyle değiştirilmiş halidir.
export interface DayReservedSlot {
  id: string
  customer_name: string
  slot_time: string
  duration_minutes: number
  is_moved: boolean
}

interface UseDayReservedSlotsReturn {
  dayReservedSlots: DayReservedSlot[]
  isLoading: boolean
  hasError: boolean
  refetch: () => void
}

export function useDayReservedSlots(date: string): UseDayReservedSlotsReturn {
  const [dayReservedSlots, setDayReservedSlots] = useState<DayReservedSlot[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)
  const [tick, setTick] = useState<number>(0)

  const refetch = useCallback((): void => {
    setTick(t => t + 1)
  }, [])

  useEffect(() => {
    let cancelled = false
    setIsLoading(true)

    const load = async (): Promise<void> => {
      const dbDay = jsToDbDayOfWeek(getJsDayOfWeek(date))

      const [{ data: slots, error: slotsError }, { data: exceptions, error: exceptionsError }] = await Promise.all([
        supabase
          .from('reserved_slots')
          .select('id, customer_name, slot_time, duration_minutes')
          .eq('day_of_week', dbDay)
          .eq('is_active', true)
          .lte('start_date', date)
          .or(`end_date.is.null,end_date.gte.${date}`),
        supabase
          .from('reserved_slot_exceptions')
          .select('reserved_slot_id, new_time')
          .eq('exception_date', date),
      ])

      if (cancelled) return

      const error = slotsError ?? exceptionsError
      if (error) {
        reportWarning('Sabit müşteri slotları yüklenemedi', { error: error.message })
        setHasError(true)
        setIsLoading(false)
        return
      }

      const exceptionBySlotId = new Map(
        (exceptions ?? []).map(e => [e.reserved_slot_id, e.new_time]),
      )

      const result: DayReservedSlot[] = []
      for (const slot of slots ?? []) {
        const hasException = exceptionBySlotId.has(slot.id)
        const newTime = exceptionBySlotId.get(slot.id)
        // İstisna "o gün gelmiyor" ise bu tarihte gösterilmez
        if (hasException && newTime === null) continue
        const isMoved = hasException && newTime !== null && newTime !== undefined
        result.push({
          id: slot.id,
          customer_name: slot.customer_name,
          slot_time: isMoved ? newTime : slot.slot_time,
          duration_minutes: slot.duration_minutes,
          is_moved: isMoved,
        })
      }
      result.sort((a, b) => a.slot_time.localeCompare(b.slot_time))

      setDayReservedSlots(result)
      setHasError(false)
      setIsLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [date, tick])

  return { dayReservedSlots, isLoading, hasError, refetch }
}
