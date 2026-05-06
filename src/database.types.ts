// Auto-generated from Supabase. Re-run when schema changes.
// (Project is currently JS, but this file is here so you can opt into TS later
// or use it for reference / JSDoc imports.)

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5'
  }
  public: {
    Tables: {
      assets: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          purchased_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          purchased_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          purchased_at?: string | null
          updated_at?: string
          user_id?: string
        }
      }
      maintenance_logs: {
        Row: {
          asset_id: string
          cost: number | null
          created_at: string
          id: string
          notes: string | null
          performed_on: string
          task_id: string
          user_id: string
        }
        Insert: {
          asset_id: string
          cost?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          performed_on?: string
          task_id: string
          user_id?: string
        }
        Update: {
          asset_id?: string
          cost?: number | null
          created_at?: string
          id?: string
          notes?: string | null
          performed_on?: string
          task_id?: string
          user_id?: string
        }
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          lead_time_days: number
          push_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          lead_time_days?: number
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          lead_time_days?: number
          push_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          timezone?: string
          updated_at?: string
          user_id?: string
        }
      }
      notifications_sent: {
        Row: {
          channel: string
          due_date: string
          id: string
          sent_at: string
          task_id: string
          user_id: string
        }
        Insert: {
          channel: string
          due_date: string
          id?: string
          sent_at?: string
          task_id: string
          user_id: string
        }
        Update: {
          channel?: string
          due_date?: string
          id?: string
          sent_at?: string
          task_id?: string
          user_id?: string
        }
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
      }
      tasks: {
        Row: {
          asset_id: string
          created_at: string
          id: string
          interval_days: number
          last_done: string | null
          next_due: string | null
          notes: string | null
          priority: number
          title: string
          updated_at: string
        }
        Insert: {
          asset_id: string
          created_at?: string
          id?: string
          interval_days: number
          last_done?: string | null
          next_due?: string | null
          notes?: string | null
          priority?: number
          title: string
          updated_at?: string
        }
        Update: {
          asset_id?: string
          created_at?: string
          id?: string
          interval_days?: number
          last_done?: string | null
          next_due?: string | null
          notes?: string | null
          priority?: number
          title?: string
          updated_at?: string
        }
      }
    }
  }
}
