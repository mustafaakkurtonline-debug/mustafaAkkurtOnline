import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { jsToDbDayOfWeek, getJsDayOfWeek, generateTimeSlots, formatTime } from '@/utils/dateUtils'

interface UseAvailableSlotsReturn {
  availableSlots: string[]
  allSlots: string[]
  bookedSlots: Set<string>
  isLoading: boolean
}

export function useAvailableSlots(
  date: string | null,
  durationMinutes: number,
): UseAvailableSlotsReturn {
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [allSlots, setAllSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    if (date === null) {
      setAvailableSlots([])
      setAllSlots([])
      setBookedSlots(new Set())
      return
    }

    let cancelled = false
    setIsLoading(true)

    const fetch = async (): Promise<void> => {
      const dbDay = jsToDbDayOfWeek(getJsDayOfWeek(date))

      // 1. Check blocked days
      const { data: blocked } = await supabase
        .from('blocked_days')
        .select('id')
        .eq('blocked_date', date)
        .limit(1)

      if (cancelled) return
      if (blocked && blocked.length > 0) {
        setAvailableSlots([])
        setAllSlots([])
        setBookedSlots(new Set())
        setIsLoading(false)
        return
      }

      // 2. Get working hours for this day
      const { data: wh } = await supabase
        .from('working_hours')
        .select('is_open, open_time, close_time')
        .eq('day_of_week', dbDay)
        .single()

      if (cancelled) return
      if (!wh || !wh.is_open) {
        setAvailableSlots([])
        setAllSlots([])
        setBookedSlots(new Set())
        setIsLoading(false)
        return
      }

      // 3. Generate all possible slots
      const slotList = generateTimeSlots(wh.open_time, wh.close_time, durationMinutes)

      // 4. Get booked appointments
      const { data: booked } = await supabase
        .from('appointments')
        .select('appointment_time')
        .eq('appointment_date', date)
        .in('status', ['pending', 'confirmed'])

      if (cancelled) return
      const bookedSet = new Set((booked ?? []).map(a => formatTime(a.appointment_time)))

      // 5. Get reserved slots for this day
      const { data: reserved } = await supabase
        .from('reserved_slots')
        .select('slot_time')
        .eq('day_of_week', dbDay)
        .eq('is_active', true)
        .lte('start_date', date)
        .or(`end_date.is.null,end_date.gte.${date}`)

      if (cancelled) return
      const reservedSet = new Set((reserved ?? []).map(r => formatTime(r.slot_time)))

      const bookedOrReserved = new Set([...bookedSet, ...reservedSet])
      const available = slotList.filter(s => !bookedOrReserved.has(s))

      setAllSlots(slotList)
      setBookedSlots(bookedOrReserved)
      setAvailableSlots(available)
      setIsLoading(false)
    }

    void fetch()
    return () => { cancelled = true }
  }, [date, durationMinutes])

  return { availableSlots, allSlots, bookedSlots, isLoading }
}
