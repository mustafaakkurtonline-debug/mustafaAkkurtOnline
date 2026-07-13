import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { jsToDbDayOfWeek, getJsDayOfWeek, generateTimeSlots } from '@/utils/dateUtils'

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

      const [{ data: bookedData }, { data: reserved }, { data: exceptions }, { data: blockedSlotData }] = await Promise.all([
        supabase.rpc('get_booked_slots', { p_date: date }),
        supabase
          .from('reserved_slots')
          .select('id, slot_time, duration_minutes')
          .eq('day_of_week', dbDay)
          .eq('is_active', true)
          .lte('start_date', date)
          .or(`end_date.is.null,end_date.gte.${date}`),
        supabase
          .from('reserved_slot_exceptions')
          .select('reserved_slot_id, new_time')
          .eq('exception_date', date),
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

      // Appointments: block any slot whose range [T, T+D) overlaps with an existing
      // appointment range [A, A+D_A). Overlap condition: T < A+D_A AND T+D > A
      type BookedRow = { slot_time: string; end_time: string }
      const bookedRanges = (bookedData ?? []) as BookedRow[]
      const blockedByAppointment = new Set(
        slots.filter(slot => {
          const slotStart = toMin(slot)
          const slotEnd = slotStart + durationMinutes
          return bookedRanges.some(r => {
            const apptStart = toMin(r.slot_time)
            const apptEnd = toMin(r.end_time)
            return slotStart < apptEnd && slotEnd > apptStart
          })
        }),
      )

      // Reserved slots: use each slot's own duration to determine the blocked range.
      // A new appointment [slotStart, slotEnd) overlaps with reserved [rStart, rEnd) if:
      //   slotStart < rEnd AND slotEnd > rStart
      // Date-specific exceptions: new_time null → slot doesn't block that date;
      // new_time set → slot blocks at new_time instead of its regular time.
      type ReservedRow = { id: string; slot_time: string; duration_minutes: number }
      type ExceptionRow = { reserved_slot_id: string; new_time: string | null }
      const exceptionBySlotId = new Map(
        ((exceptions ?? []) as ExceptionRow[]).map(e => [e.reserved_slot_id, e.new_time]),
      )
      const blockedByReserved = new Set(
        slots.filter(slot => {
          const slotStart = toMin(slot)
          const slotEnd = slotStart + durationMinutes
          return (reserved ?? []).some((r: ReservedRow) => {
            const hasException = exceptionBySlotId.has(r.id)
            const newTime = exceptionBySlotId.get(r.id)
            if (hasException && newTime === null) return false
            const rStart = toMin(hasException && newTime !== undefined && newTime !== null ? newTime : r.slot_time)
            const rEnd = rStart + (r.duration_minutes ?? 60)
            return slotStart < rEnd && slotEnd > rStart
          })
        }),
      )

      // Admin-blocked time ranges: full overlap check, same formula as appointments/reserved.
      const ranges = (blockedSlotData ?? []) as { start_time: string; end_time: string }[]
      const blockedByRange = new Set(
        slots.filter(slot => {
          const slotStart = toMin(slot)
          const slotEnd = slotStart + durationMinutes
          return ranges.some(r => slotStart < toMin(r.end_time) && slotEnd > toMin(r.start_time))
        }),
      )

      setAllSlots(slots)
      setBookedSlots(new Set([...blockedByAppointment, ...blockedByReserved, ...blockedByRange]))
      setIsLoading(false)
    }

    void load()
    return () => { cancelled = true }
  }, [date, durationMinutes])

  return { allSlots, bookedSlots, isLoading }
}
