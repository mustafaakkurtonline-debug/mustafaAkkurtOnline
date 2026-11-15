const LOCALE = 'tr-TR'

// "AHMET" / "ahmet" / "  aHMet " → "Ahmet" (Türkçe harf kurallarıyla: "işıl" → "Işıl" değil "İşıl")
export function formatFirstName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''
  return trimmed.charAt(0).toLocaleUpperCase(LOCALE) + trimmed.slice(1).toLocaleLowerCase(LOCALE)
}
