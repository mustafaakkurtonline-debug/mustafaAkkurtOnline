import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { jsToDbDayOfWeek, getJsDayOfWeek, generateTimeSlots, formatTime } from '@/utils/dateUtils'

interface SlotData {
  allSlots: string[]
  bookedSlots: Set<string>
  isLoading: boolean
}

export function useAvailableSlots(date: string | null, durationMinutes: number): SlotData {
  const [allSlots, setAllSlots] = useState<string[]>([])
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (date === null) {
      setAllSlots([])
      setBookedSlots(new Set())
      return
    }

    let cancelled = false
    setIsLoading(true)

    const load = async (): Promise<void> => {
      const dbDay = jsToDbDayOfWeek(getJsDayOfWeek(date))

      const { data: blocked } = await supabase
        .from('blocked_days')
        .select('id')
        .eq('blocked_date', date)
        .limit(1)

      if (cancelled) return

      if (blocked && blocked.length > 0) {
        setAllSlots([])
        setBookedSlots(new Set())
        setIsLoading(false)
        return
      }

      const { data: wh } = await supabase
        .from('working_hours')
        .select('is_open, open_time, close_time')
        .eq('day_of_week', dbDay)
        .single()

      if (cancelled) return

      if (!wh?.is_open) {
        setAllSlots([])
        setBookedSlots(new Set())
        setIsLoading(false)
        return
      }

      const slots = generateTimeSlots(wh.open_time, wh.close_time, durationMinutes)

      const [{ data: appointments }, { data: reserved }] = await Promise.all([
        supabase
          .from('appointments')
          .select('appointment_time')
          .eq('appointment_date', date)
          .in('status', ['pending', 'confirmed']),
        supabase
          .from('reserved_slots')
          .select('slot_time')
          .eq('day_of_week', dbDay)
          .eq('is_active', true)
          .lte('start_date', date)
          .or(`end_date.is.null,end_date.gte.${date}`),
      ])

      if (cancelled) return

      const booked = new Set([
        ...(appointments ?? []).map(a => formatTime(a.appointment_time)),
        ...(reserved ?? []).map(r => formatTime(r.slot_time)),
      ])

      setAllSlots(slots)
      setBookedSlots(booked)
      setIsLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [date, durationMinutes])

  return { allSlots, bookedSlots, isLoading }
}
