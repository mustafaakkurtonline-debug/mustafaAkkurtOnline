export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type AppointmentStatus = 'pending' | 'confirmed' | 'completed' | 'no_show'

export interface Database {
  public: {
    Tables: {
      services: {
        Row: {
          id: string
          name: string
          duration_minutes: number
          price: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          duration_minutes: number
          price: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          duration_minutes?: number
          price?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          id: string
          customer_name: string
          customer_phone: string
          service_id: string
          appointment_date: string
          appointment_time: string
          status: AppointmentStatus
          no_show_notified: boolean
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          customer_phone: string
          service_id: string
          appointment_date: string
          appointment_time: string
          status?: AppointmentStatus
          no_show_notified?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          customer_phone?: string
          service_id?: string
          appointment_date?: string
          appointment_time?: string
          status?: AppointmentStatus
          no_show_notified?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointments_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
      reserved_slots: {
        Row: {
          id: string
          customer_name: string
          day_of_week: number
          slot_time: string
          duration_minutes: number
          start_date: string
          end_date: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          day_of_week: number
          slot_time: string
          duration_minutes?: number
          start_date: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          day_of_week?: number
          slot_time?: string
          duration_minutes?: number
          start_date?: string
          end_date?: string | null
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      banned_customers: {
        Row: {
          id: string
          customer_phone: string
          banned_until: string
          reason: string
          created_at: string
        }
        Insert: {
          id?: string
          customer_phone: string
          banned_until: string
          reason: string
          created_at?: string
        }
        Update: {
          id?: string
          customer_phone?: string
          banned_until?: string
          reason?: string
          created_at?: string
        }
        Relationships: []
      }
      working_hours: {
        Row: {
          id: string
          day_of_week: number
          open_time: string
          close_time: string
          is_open: boolean
        }
        Insert: {
          id?: string
          day_of_week: number
          open_time: string
          close_time: string
          is_open?: boolean
        }
        Update: {
          id?: string
          day_of_week?: number
          open_time?: string
          close_time?: string
          is_open?: boolean
        }
        Relationships: []
      }
      blocked_days: {
        Row: {
          id: string
          blocked_date: string
          reason: string
        }
        Insert: {
          id?: string
          blocked_date: string
          reason: string
        }
        Update: {
          id?: string
          blocked_date?: string
          reason?: string
        }
        Relationships: []
      }
      blocked_slots: {
        Row: {
          id: string
          blocked_date: string
          start_time: string
          end_time: string
          reason: string | null
          created_at: string
        }
        Insert: {
          id?: string
          blocked_date: string
          start_time: string
          end_time: string
          reason?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          blocked_date?: string
          start_time?: string
          end_time?: string
          reason?: string | null
          created_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
        Relationships: []
      }
      appointment_reminders: {
        Row: {
          id: string
          appointment_id: string
          endpoint: string
          p256dh: string
          auth: string
          reminder_sent: boolean
          created_at: string
        }
        Insert: {
          id?: string
          appointment_id: string
          endpoint: string
          p256dh: string
          auth: string
          reminder_sent?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          appointment_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          reminder_sent?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'appointment_reminders_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: Record<string, never>
    Functions: {
      get_my_appointments: {
        Args: { p_phone: string }
        Returns: Array<{
          id: string
          appointment_date: string
          appointment_time: string
          status: AppointmentStatus
          service_name: string | null
          duration_minutes: number | null
          price: number | null
        }>
      }
      cancel_my_appointment: {
        Args: { p_appointment_id: string; p_phone: string }
        Returns: boolean
      }
      get_booked_slots: {
        Args: { p_date: string }
        Returns: { slot_time: string; end_time: string }[]
      }
    }
    Enums: {
      appointment_status: AppointmentStatus
    }
    CompositeTypes: Record<string, never>
  }
}
