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

      const [{ data: bookedData }, { data: reserved }, { data: blockedSlotData }] = await Promise.all([
        supabase.rpc('get_booked_slots', { p_date: date }),
        supabase
          .from('reserved_slots')
          .select('slot_time')
          .eq('day_of_week', dbDay)
          .eq('is_active', true)
          .lte('start_date', date)
          .or(`end_date.is.null,end_date.gte.${date}`),
        supabase
          .from('blocked_slots')
          .select('start_time, end_time')
          .eq('blocked_date', date),
      ])

      if (cancelled) return

      const toMin = (t: string): number => {
        const [h, m] = t.split(':').map(Number)
        return h * 60 + m
      }
      const ranges = (blockedSlotData ?? []) as { start_time: string; end_time: string }[]
      const blockedByRange = new Set(
        slots.filter(slot =>
          ranges.some(r => toMin(slot) >= toMin(r.start_time) && toMin(slot) < toMin(r.end_time)),
        ),
      )

      const booked = new Set([
        ...(bookedData ?? []).map((r: { slot_time: string }) => formatTime(r.slot_time)),
        ...(reserved ?? []).map(r => formatTime(r.slot_time)),
        ...blockedByRange,
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
