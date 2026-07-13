import { describe, it, expect } from 'vitest'
import {
  jsToDbDayOfWeek,
  timeToMinutes,
  minutesToTime,
  generateTimeSlots,
  getTodayString,
  addDays,
  formatTime,
  getNextDateForDbDay,
} from './dateUtils'

describe('jsToDbDayOfWeek', () => {
  it('converts Sunday (JS 0) → DB 6', () => {
    expect(jsToDbDayOfWeek(0)).toBe(6)
  })
  it('converts Monday (JS 1) → DB 0', () => {
    expect(jsToDbDayOfWeek(1)).toBe(0)
  })
  it('converts Saturday (JS 6) → DB 5', () => {
    expect(jsToDbDayOfWeek(6)).toBe(5)
  })
})

describe('timeToMinutes', () => {
  it('converts 00:00 → 0', () => {
    expect(timeToMinutes('00:00')).toBe(0)
  })
  it('converts 09:30 → 570', () => {
    expect(timeToMinutes('09:30')).toBe(570)
  })
  it('converts 19:00 → 1140', () => {
    expect(timeToMinutes('19:00')).toBe(1140)
  })
})

describe('minutesToTime', () => {
  it('converts 0 → 00:00', () => {
    expect(minutesToTime(0)).toBe('00:00')
  })
  it('converts 570 → 09:30', () => {
    expect(minutesToTime(570)).toBe('09:30')
  })
  it('converts 1140 → 19:00', () => {
    expect(minutesToTime(1140)).toBe('19:00')
  })
})

describe('generateTimeSlots', () => {
  it('generates correct slots for 09:00-11:00 with 30 min duration', () => {
    expect(generateTimeSlots('09:00', '11:00', 30)).toEqual([
      '09:00', '09:30', '10:00', '10:30',
    ])
  })
  it('excludes slot that would overflow end time', () => {
    const slots = generateTimeSlots('09:00', '10:00', 45)
    expect(slots).toEqual(['09:00'])
  })
  it('returns empty array when duration exceeds window', () => {
    expect(generateTimeSlots('09:00', '09:30', 60)).toEqual([])
  })
})

describe('getTodayString', () => {
  it('returns YYYY-MM-DD format', () => {
    expect(getTodayString()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('addDays', () => {
  it('adds positive days', () => {
    expect(addDays('2026-05-01', 7)).toBe('2026-05-08')
  })
  it('subtracts days with negative offset', () => {
    expect(addDays('2026-05-01', -1)).toBe('2026-04-30')
  })
  it('handles month boundary', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
  })
  it('adding 14 days for ban calculation', () => {
    expect(addDays('2026-05-03', 14)).toBe('2026-05-17')
  })
})

describe('formatTime', () => {
  it('strips seconds from HH:mm:ss', () => {
    expect(formatTime('09:30:00')).toBe('09:30')
  })
  it('passes through HH:mm unchanged', () => {
    expect(formatTime('09:30')).toBe('09:30')
  })
})

describe('getNextDateForDbDay', () => {
  // 2026-07-14 Salı → DB gün 1
  it('returns the same date when the day matches', () => {
    expect(getNextDateForDbDay(1, '2026-07-14')).toBe('2026-07-14')
  })
  it('returns the next occurrence within the same week', () => {
    expect(getNextDateForDbDay(4, '2026-07-14')).toBe('2026-07-17')
  })
  it('wraps to next week for a day already passed', () => {
    expect(getNextDateForDbDay(0, '2026-07-14')).toBe('2026-07-20')
  })
})
