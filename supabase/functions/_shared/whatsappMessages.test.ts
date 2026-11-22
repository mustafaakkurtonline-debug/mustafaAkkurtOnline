import { describe, it, expect } from 'vitest'
import {
  toE164,
  firstName,
  formatDateTr,
  formatTimeTr,
  tomorrowInIstanbul,
  revisitWindowStart,
  pickRevisitTargets,
  reminderParams,
  revisitParams,
  buildTemplateBody,
  TEMPLATES,
} from './whatsappMessages'
import type { VisitRow } from './whatsappMessages'

const TODAY = '2026-11-21'

let rowId = 0
function visit(overrides: Partial<VisitRow>): VisitRow {
  rowId += 1
  return {
    id: `a${rowId}`,
    customer_name: 'İlkay Yılmaz',
    customer_phone: '05321234567',
    appointment_date: '2026-11-01',
    status: 'completed',
    whatsapp_revisit_sent_at: null,
    ...overrides,
  }
}

function daysAgo(days: number): string {
  const date = new Date(`${TODAY}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

describe('biçimlendirme', () => {
  it('telefonu uluslararası biçime çevirir', () => {
    expect(toE164('0532 123 45 67')).toBe('905321234567')
    expect(toE164('+90 532 123 45 67')).toBe('905321234567')
    expect(toE164('5321234567')).toBe('905321234567')
  })

  it('tarihi ve saati Türkçe yazar', () => {
    expect(formatDateTr('2026-11-20')).toBe('20 Kasım Cuma')
    expect(formatTimeTr('09:05:00')).toBe('09:05')
  })

  it('yalnızca ilk adı Türkçe harf kurallarıyla yazar', () => {
    expect(firstName('  işıl  YILMAZ ')).toBe('İşıl')
    expect(firstName('AHMET')).toBe('Ahmet')
    expect(firstName('   ')).toBe('Değerli müşterimiz')
  })
})

describe('yarın (İstanbul)', () => {
  it('UTC gece yarısından önce de İstanbul tarihine göre hesaplar', () => {
    // 19 Kasım 22:30 UTC = 20 Kasım 01:30 İstanbul → yarın 21 Kasım
    expect(tomorrowInIstanbul(new Date('2026-11-19T22:30:00Z'))).toBe('2026-11-21')
    // 21:00 İstanbul (hatırlatma saati) → yarın 20 Kasım
    expect(tomorrowInIstanbul(new Date('2026-11-19T18:00:00Z'))).toBe('2026-11-20')
  })
})

describe('pickRevisitTargets (20 gün bakım daveti)', () => {
  it('son randevunun 20–23 gün öncesi aralığında gider', () => {
    expect(revisitWindowStart(TODAY)).toBe(daysAgo(23))
    expect(pickRevisitTargets([visit({ appointment_date: daysAgo(19) })], [], TODAY)).toHaveLength(0)
    expect(pickRevisitTargets([visit({ appointment_date: daysAgo(20) })], [], TODAY)).toHaveLength(1)
    expect(pickRevisitTargets([visit({ appointment_date: daysAgo(23) })], [], TODAY)).toHaveLength(1)
    expect(pickRevisitTargets([visit({ appointment_date: daysAgo(24) })], [], TODAY)).toHaveLength(0)
  })

  it('müşterinin sonradan ya da ileri tarihli randevusu varsa gitmez', () => {
    const old = visit({ appointment_date: daysAgo(20) })
    expect(pickRevisitTargets([old, visit({ appointment_date: daysAgo(5) })], [], TODAY)).toHaveLength(0)
    expect(pickRevisitTargets([old, visit({ appointment_date: '2026-11-25', status: 'pending' })], [], TODAY)).toHaveLength(0)
  })

  it('"gelmedi" randevusu son randevu sayılmaz', () => {
    const old = visit({ appointment_date: daysAgo(20) })
    const missed = visit({ appointment_date: daysAgo(10), status: 'no_show' })
    expect(pickRevisitTargets([old, missed], [], TODAY)).toEqual([old])
  })

  it('aynı numaranın farklı yazımları tek müşteri sayılır', () => {
    const rows = [
      visit({ appointment_date: daysAgo(21), customer_phone: '0532 123 45 67' }),
      visit({ appointment_date: daysAgo(20), customer_phone: '+905321234567' }),
    ]
    const targets = pickRevisitTargets(rows, [], TODAY)
    expect(targets).toHaveLength(1)
    expect(targets[0]?.appointment_date).toBe(daysAgo(20))
  })

  it('daha önce gönderildiyse ya da müşteri yasaklıysa gitmez', () => {
    const sent = visit({ appointment_date: daysAgo(21), whatsapp_revisit_sent_at: '2026-11-20T18:00:00Z' })
    expect(pickRevisitTargets([sent], [], TODAY)).toHaveLength(0)
    expect(pickRevisitTargets([visit({ appointment_date: daysAgo(20) })], ['0532 123 45 67'], TODAY)).toHaveLength(0)
  })
})

describe('şablon değişkenleri', () => {
  it('hatırlatma: ilk ad, tarih, saat', () => {
    const appointment = { customer_name: 'İlkay  Yılmaz', appointment_date: '2026-11-20', appointment_time: '14:30:00' }
    expect(reminderParams(appointment)).toEqual(['İlkay', '20 Kasım Cuma', '14:30'])
  })

  it('bakım daveti: ilk ad', () => {
    expect(revisitParams('mehmet ali kaya')).toEqual(['Mehmet'])
  })

  it('Cloud API gövdesi', () => {
    const body = buildTemplateBody('0532 123 45 67', TEMPLATES.revisit, ['A', 'B'])
    expect(body.to).toBe('905321234567')
    expect(body.template.name).toBe('bakim_hatirlatma')
    expect(body.template.language.code).toBe('tr')
    expect(body.template.components[0]?.parameters).toEqual([{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }])
  })
})
