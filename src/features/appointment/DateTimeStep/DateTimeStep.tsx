import { useState } from 'react'
import { useAvailableSlots } from '@/hooks/useAvailableSlots'
import { getTodayString, addDays } from '@/utils/dateUtils'
import { MAX_BOOKING_DAYS } from '@/constants/appointment'
import type { Service } from '@/types/appointment'

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const SHORT_DAYS_TR = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']
const LONG_DAYS_TR = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar']

interface CalendarDay {
  dateStr: string
  dayNumber: number
  isCurrentMonth: boolean
  isDisabled: boolean
  isToday: boolean
}

function buildCalendarGrid(year: number, month: number, todayStr: string, maxDateStr: string): CalendarDay[][] {
  const firstDay = new Date(year, month, 1)
  const lastDayNum = new Date(year, month + 1, 0).getDate()
  // Monday-first: JS getDay() 0=Sun → convert to 0=Mon
  const firstDayOfWeek = (firstDay.getDay() + 6) % 7

  const days: CalendarDay[] = []

  // Pad with previous month days
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month, -i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ dateStr: ds, dayNumber: d.getDate(), isCurrentMonth: false, isDisabled: true, isToday: false })
  }

  // Current month days
  for (let d = 1; d <= lastDayNum; d++) {
    const ds = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    days.push({ dateStr: ds, dayNumber: d, isCurrentMonth: true, isDisabled: ds < todayStr || ds > maxDateStr, isToday: ds === todayStr })
  }

  // Pad to complete last week
  const remaining = (7 - (days.length % 7)) % 7
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i)
    const ds = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    days.push({ dateStr: ds, dayNumber: d.getDate(), isCurrentMonth: false, isDisabled: true, isToday: false })
  }

  const weeks: CalendarDay[][] = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  return weeks
}

function formatDateCompact(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const dow = (date.getDay() + 6) % 7
  return `${day} ${MONTHS_TR[month - 1]} ${LONG_DAYS_TR[dow]}`
}

interface DateTimeStepProps {
  service: Service
  selectedDate: string | null
  selectedTime: string | null
  onDateChange: (date: string) => void
  onTimeChange: (time: string) => void
  onContinue: () => void
  onBack: () => void
}

export function DateTimeStep({
  service,
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
  onContinue,
  onBack,
}: DateTimeStepProps) {
  const todayStr = getTodayString()
  const maxDateStr = addDays(todayStr, MAX_BOOKING_DAYS - 1)

  const todayDate = new Date()
  const [calYear, setCalYear] = useState<number>(() => {
    if (selectedDate) return parseInt(selectedDate.slice(0, 4), 10)
    return todayDate.getFullYear()
  })
  const [calMonth, setCalMonth] = useState<number>(() => {
    if (selectedDate) return parseInt(selectedDate.slice(5, 7), 10) - 1
    return todayDate.getMonth()
  })
  const [showCalendar, setShowCalendar] = useState<boolean>(selectedDate === null)

  const { allSlots, bookedSlots, isLoading } = useAvailableSlots(selectedDate, service.duration_minutes)

  // Seçilen tarih bugünse, saati geçmiş slotları devre dışı bırak.
  // Randevu "completed" olsa bile geçmiş saate yeni randevu alınamaz.
  const now = new Date()
  const isPastSlot = (slot: string): boolean => {
    if (!selectedDate || selectedDate > todayStr) return false
    const [h, m] = slot.split(':').map(Number)
    return h * 60 + m <= now.getHours() * 60 + now.getMinutes()
  }

  const weeks = buildCalendarGrid(calYear, calMonth, todayStr, maxDateStr)

  const maxDate = new Date(maxDateStr)
  const canGoPrevMonth = calYear > todayDate.getFullYear() || calMonth > todayDate.getMonth()
  const canGoNextMonth =
    calYear < maxDate.getFullYear() ||
    (calYear === maxDate.getFullYear() && calMonth < maxDate.getMonth())

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const handleDateSelect = (dateStr: string) => {
    onDateChange(dateStr)
    setShowCalendar(false)
  }

  const navigateDate = (dir: -1 | 1) => {
    if (!selectedDate) return
    const next = addDays(selectedDate, dir)
    if (next >= todayStr && next <= maxDateStr) onDateChange(next)
  }

  return (
    <div className="pt-6 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-7">
        <button
          type="button"
          onClick={() => { if (!showCalendar && selectedDate !== null) { setShowCalendar(true) } else { onBack() } }}
          className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shrink-0 shadow-sm"
          aria-label={!showCalendar && selectedDate !== null ? 'Tarihe Dön' : 'Geri'}
        >
          ←
        </button>
        <h1 className="text-gray-900 font-bold text-xl leading-tight">
          Tarih ve Saat Seçin{' '}
          <span className="text-gray-400 font-normal text-base">(2/3)</span>
        </h1>
      </div>

      {/* "Takvimi Aç" toggle */}
      {!showCalendar && selectedDate !== null && (
        <button
          type="button"
          onClick={() => { setShowCalendar(true) }}
          className="flex items-center gap-2 text-gray-500 text-sm mb-5 hover:text-gray-800 transition-colors"
        >
          <span>📅</span>
          <span className="underline underline-offset-2">Takvimi Aç</span>
        </button>
      )}

      {/* Full calendar */}
      {showCalendar && (
        <div className="mb-6 animate-fade-in">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-900 font-semibold">
              {MONTHS_TR[calMonth]} {calYear}
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={prevMonth}
                disabled={!canGoPrevMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors text-lg"
                aria-label="Önceki ay"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextMonth}
                disabled={!canGoNextMonth}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:text-gray-200 disabled:cursor-not-allowed transition-colors text-lg"
                aria-label="Sonraki ay"
              >
                ›
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {SHORT_DAYS_TR.map(d => (
              <div key={d} className="text-center text-gray-400 text-xs font-medium py-2">{d}</div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="space-y-1">
            {weeks.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 gap-1">
                {week.map((day) => {
                  const isSelected = day.dateStr === selectedDate
                  if (!day.isCurrentMonth) {
                    return <div key={day.dateStr} className="aspect-square" />
                  }
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => { if (!day.isDisabled) handleDateSelect(day.dateStr) }}
                      disabled={day.isDisabled}
                      className={[
                        'aspect-square flex items-center justify-center rounded-xl text-sm font-medium transition-all',
                        day.isDisabled
                          ? 'text-gray-300 cursor-not-allowed'
                          : isSelected
                          ? 'bg-gray-900 text-white'
                          : day.isToday
                          ? 'bg-gray-200 text-gray-900 font-bold'
                          : 'bg-gray-100 text-gray-800 hover:bg-gray-200',
                      ].join(' ')}
                    >
                      {day.dayNumber}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compact date navigator */}
      {!showCalendar && selectedDate !== null && (
        <div className="flex items-center justify-between bg-gray-100 rounded-2xl px-4 py-3 mb-5 animate-fade-in">
          <span className="text-gray-900 font-medium text-sm">
            {formatDateCompact(selectedDate)}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => { navigateDate(-1) }}
              disabled={selectedDate <= todayStr}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:text-gray-300 transition-colors text-lg"
              aria-label="Önceki gün"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => { navigateDate(1) }}
              disabled={selectedDate >= maxDateStr}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200 disabled:text-gray-300 transition-colors text-lg"
              aria-label="Sonraki gün"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {/* Time slots */}
      {selectedDate !== null && !showCalendar && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : allSlots.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 text-sm">Bu gün için uygun saat yok.</p>
            </div>
          ) : (
            <div key={selectedDate} className="grid grid-cols-2 gap-2 animate-slide-up">
              {allSlots.map((slot) => {
                const isBooked = bookedSlots.has(slot)
                const isPast   = !isBooked && isPastSlot(slot)
                const isUnavailable = isBooked || isPast
                const isSelected    = !isUnavailable && slot === selectedTime
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => { if (!isUnavailable) onTimeChange(slot) }}
                    disabled={isUnavailable}
                    className={[
                      'flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-medium border transition-all duration-150',
                      isBooked
                        ? 'bg-red-50 text-red-400 border-red-200 cursor-not-allowed opacity-80'
                        : isPast
                        ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                        : isSelected
                        ? 'bg-gray-900 text-white border-gray-900 active:scale-[0.97]'
                        : 'bg-white text-gray-800 border-gray-200 hover:border-gray-400 active:scale-[0.97]',
                    ].join(' ')}
                  >
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isBooked ? 'bg-red-300' : isPast ? 'bg-gray-200' : isSelected ? 'bg-brand-400' : 'bg-brand-300'}`} />
                    <span>{slot}</span>
                    {isBooked && <span className="text-xs font-semibold">Dolu</span>}
                    {isPast   && <span className="text-xs">Geçti</span>}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Placeholder when calendar open and no date yet */}
      {showCalendar && selectedDate === null && (
        <p className="text-center text-gray-400 text-sm pt-2">Bir tarih seçin</p>
      )}

      {/* Continue button */}
      {selectedDate !== null && selectedTime !== null && (
        <button
          type="button"
          onClick={onContinue}
          className="w-full mt-7 bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-white font-bold py-4 rounded-full transition-all"
        >
          Devam Et →
        </button>
      )}
    </div>
  )
}
