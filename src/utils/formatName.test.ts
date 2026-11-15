import { describe, it, expect } from 'vitest'
import { formatFirstName } from './formatName'

describe('formatFirstName', () => {
  it('büyük harfle yazılmış adı düzeltir', () => {
    expect(formatFirstName('AHMET')).toBe('Ahmet')
  })

  it('küçük harfle yazılmış adı düzeltir', () => {
    expect(formatFirstName('mehmet')).toBe('Mehmet')
  })

  it('Türkçe i/ı harflerini doğru çevirir', () => {
    expect(formatFirstName('işıl')).toBe('İşıl')
    expect(formatFirstName('ILKAY')).toBe('Ilkay')
    expect(formatFirstName('İSMAİL')).toBe('İsmail')
  })

  it('boşlukları atar, boş ad için boş döner', () => {
    expect(formatFirstName('  ali ')).toBe('Ali')
    expect(formatFirstName('   ')).toBe('')
  })
})
