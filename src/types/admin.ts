import type { Database, AppointmentStatus } from './database'

export type { AppointmentStatus }

export type Service = Database['public']['Tables']['services']['Row']
export type WorkingHour = Database['public']['Tables']['working_hours']['Row']
export type BlockedDay = Database['public']['Tables']['blocked_days']['Row']
export type BannedCustomer = Database['public']['Tables']['banned_customers']['Row']
export type ReservedSlot = Database['public']['Tables']['reserved_slots']['Row']

export interface AppointmentWithService {
  id: string
  customer_name: string
  customer_phone: string
  service_id: string
  appointment_date: string
  appointment_time: string
  status: AppointmentStatus
  no_show_notified: boolean
  created_at: string
  services: {
    name: string
    duration_minutes: number
    price: number
  } | null
}

export interface BlockedSlot {
  id: string
  blocked_date: string
  start_time: string
  end_time: string
  reason: string | null
  created_at: string
}

export type AdminTab = 'dashboard' | 'services' | 'settings'
