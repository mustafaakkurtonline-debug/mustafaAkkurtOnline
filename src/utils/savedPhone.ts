import { CUSTOMER_PHONE_STORAGE_KEY } from '@/constants/appointment'

// Depolama kapalı ya da doluysa numara yalnızca hatırlanmaz; randevu akışı etkilenmez
export function readSavedPhone(): string {
  try {
    return localStorage.getItem(CUSTOMER_PHONE_STORAGE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function savePhone(phone: string): void {
  try {
    localStorage.setItem(CUSTOMER_PHONE_STORAGE_KEY, phone)
  } catch {
    // Numara hatırlanamazsa müşteri bir sonraki randevuda yeniden yazar
  }
}
