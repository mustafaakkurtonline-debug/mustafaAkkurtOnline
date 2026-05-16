import type { Database } from './database'

export type Service = Database['public']['Tables']['services']['Row']

export type WizardStep = 'service' | 'datetime' | 'form' | 'confirmation' | 'success'

export interface AppointmentFormData {
  service: Service
  date: string
  time: string
  customerName: string
  customerPhone: string
}
