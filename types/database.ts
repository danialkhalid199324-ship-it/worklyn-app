// Typed to match supabase-js v2.x (PostgrestVersion 12+).
// Required: Views, Functions, CompositeTypes, and Relationships on every table.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export type ReportType =
  | 'revenue'
  | 'appointments'
  | 'clients'
  | 'invoices'
  | 'custom'

export type UserRole = 'practitioner' | 'admin'

export type SessionStatus = 'scheduled' | 'completed' | 'cancelled'

export type NotificationType = 'confirmation' | 'reminder'
export type NotificationStatus = 'pending' | 'sent' | 'failed'

export type FundingType = 'NDIS' | 'Medicare' | 'Private / Other'
export type UnitType = 'hourly' | 'session' | 'fixed'
export type NdisManagementType = 'NDIA-managed' | 'Self-managed' | 'Plan-managed'
export type InvoiceRecipientType = 'client' | 'plan_manager' | 'self_manager' | 'ndia_claim'

// ---------------------------------------------------------------------------
// Table row types
// ---------------------------------------------------------------------------
export interface UserRow {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface PractitionerRow {
  id: string
  user_id: string
  first_name: string
  last_name: string
  display_name: string | null
  bio: string | null
  phone: string | null
  timezone: string
  booking_page_slug: string | null
  is_accepting_clients: boolean
  created_at: string
  updated_at: string
}

export interface ClientRow {
  id: string
  practitioner_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  address: string | null
  notes: string | null
  funding_type: FundingType | null
  ndis_number: string | null
  ndis_management_type: NdisManagementType | null
  self_manager_name: string | null
  self_manager_relation: string | null
  self_manager_email: string | null
  self_manager_phone: string | null
  plan_manager_name: string | null
  plan_manager_email: string | null
  plan_manager_phone: string | null
  medicare_number: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ServiceRow {
  id: string
  practitioner_id: string
  name: string
  // NDIS catalogue fields
  category: string | null
  ndis_line_item: string | null
  support_item_number: string | null  // soft FK → ndis_price_guide.support_item_number
  default_rate: number | null         // fallback rate (dollars per hour/session)
  weekday_rate: number | null         // Mon–Fri rate
  saturday_rate: number | null
  sunday_rate: number | null
  public_holiday_rate: number | null
  unit_type: UnitType
  gst_applicable: boolean
  // Legacy booking fields (kept for appointment flow)
  description: string | null
  duration_minutes: number
  price_cents: number
  currency: string
  color: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface NdisPriceGuideRow {
  id: string
  support_item_number: string
  support_item_name: string
  support_category: string
  unit: string
  weekday_rate: number | null
  saturday_rate: number | null
  sunday_rate: number | null
  public_holiday_rate: number | null
  effective_from: string   // YYYY-MM-DD
  effective_to: string | null
  source_version: string
}

export interface AvailabilityRuleRow {
  id: string
  practitioner_id: string
  day_of_week: 0 | 1 | 2 | 3 | 4 | 5 | 6
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
}

export interface BlockedTimeRow {
  id: string
  practitioner_id: string
  start_time: string
  end_time: string
  reason: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentRow {
  id: string
  practitioner_id: string
  client_id: string
  service_id: string | null
  start_time: string
  end_time: string
  status: AppointmentStatus
  location: string | null
  client_notes: string | null
  internal_notes: string | null
  price_cents: number | null
  currency: string
  created_at: string
  updated_at: string
}

export interface SessionNoteRow {
  id: string
  appointment_id: string
  practitioner_id: string
  content: string
  is_private: boolean
  goals_addressed: string | null
  observations: string | null
  interventions_used: string | null
  participant_response: string | null
  risks_issues: string | null
  next_steps: string | null
  progress_score: number | null
  created_at: string
  updated_at: string
}

export interface ReportRow {
  id: string
  practitioner_id: string
  client_id: string | null
  type: ReportType
  title: string
  period_start: string | null
  period_end: string | null
  data: Json
  draft_text: string | null
  final_text: string | null
  pdf_path: string | null
  created_at: string
}

export interface InvoiceRow {
  id: string
  practitioner_id: string
  client_id: string
  appointment_id: string | null
  invoice_number: string
  status: InvoiceStatus
  subtotal_cents: number
  tax_cents: number
  total_cents: number
  currency: string
  notes: string | null
  issued_at: string | null
  due_at: string | null
  paid_at: string | null
  recipient_type: InvoiceRecipientType | null
  recipient_name: string | null
  recipient_email: string | null
  recipient_phone: string | null
  billing_note: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceItemRow {
  id: string
  invoice_id: string
  description: string
  quantity: number
  unit_price_cents: number
  total_cents: number
  created_at: string
}

export interface SessionRow {
  id: string
  practitioner_id: string
  client_id: string
  appointment_id: string | null
  service_id: string | null      // FK to services (catalogue)
  service_date: string           // YYYY-MM-DD
  start_time: string | null      // HH:MM:SS
  end_time: string | null        // HH:MM:SS
  duration_minutes: number
  ndis_line_item: string | null
  rate: number                   // dollars per hour
  notes: string | null
  status: SessionStatus
  invoice_id: string | null
  notes_locked_at: string | null  // set when session is first linked to an invoice
  notes_locked_by: string | null  // auth user id of practitioner who invoiced
  created_at: string
  updated_at: string
}

export interface SessionNotificationRow {
  id: string
  practitioner_id: string
  session_id: string
  type: NotificationType
  recipient_name: string | null
  recipient_email: string | null
  status: NotificationStatus
  error_message: string | null
  sent_at: string | null
  created_at: string
}

export interface OrgSettingsRow {
  id: string
  practitioner_id: string
  business_name: string | null
  abn: string | null
  bank_account_name: string | null
  bsb: string | null
  account_number: string | null
  payment_reference_prefix: string | null
  logo_url: string | null
  created_at: string
  updated_at: string
}

// ---------------------------------------------------------------------------
// Insert / Update types
// ---------------------------------------------------------------------------
export type InsertUser = Omit<UserRow, 'created_at' | 'updated_at'>
export type InsertPractitioner = Omit<PractitionerRow, 'id' | 'created_at' | 'updated_at'>
export type InsertClient = Omit<ClientRow, 'id' | 'created_at' | 'updated_at'>
export type InsertService = Omit<ServiceRow, 'id' | 'created_at' | 'updated_at'>
export type InsertAvailabilityRule = Omit<AvailabilityRuleRow, 'id' | 'created_at' | 'updated_at'>
export type InsertBlockedTime = Omit<BlockedTimeRow, 'id' | 'created_at' | 'updated_at'>
export type InsertAppointment = Omit<AppointmentRow, 'id' | 'created_at' | 'updated_at'>
export type InsertSessionNote = Omit<SessionNoteRow, 'id' | 'created_at' | 'updated_at'>
export type InsertReport = Omit<ReportRow, 'id' | 'created_at'> & { data?: Json }
export type InsertInvoice = Omit<InvoiceRow, 'id' | 'created_at' | 'updated_at'>
export type InsertInvoiceItem = Omit<InvoiceItemRow, 'id' | 'total_cents' | 'created_at'>

export interface InvoiceAuditLogRow {
  id: string
  invoice_id: string
  practitioner_id: string
  edited_by: string
  previous_values: Record<string, unknown>
  updated_values: Record<string, unknown>
  reason: string | null
  edited_at: string
}
export type InsertInvoiceAuditLog = Omit<InvoiceAuditLogRow, 'id' | 'edited_at'>
export type InsertOrgSettings = Omit<OrgSettingsRow, 'id' | 'created_at' | 'updated_at'>
export type InsertSession = Omit<SessionRow, 'id' | 'created_at' | 'updated_at'>
export type UpdateSession = Partial<Omit<SessionRow, 'id' | 'practitioner_id' | 'client_id' | 'created_at' | 'updated_at'>>
export type InsertCatalogueService = {
  practitioner_id: string
  name: string
  category?: string | null
  ndis_line_item?: string | null
  support_item_number?: string | null
  default_rate?: number | null
  unit_type?: UnitType
  gst_applicable?: boolean
  description?: string | null
  duration_minutes?: number
  price_cents?: number
  currency?: string
  color?: string | null
  is_active?: boolean
}

export type InsertNdisPriceGuide = Omit<NdisPriceGuideRow, 'id'>
export type UpdateNdisPriceGuide = Partial<Omit<NdisPriceGuideRow, 'id'>>
export type InsertSessionNotification = Omit<SessionNotificationRow, 'id' | 'created_at'>
export type UpdateSessionNotification = Partial<Pick<SessionNotificationRow, 'status' | 'error_message' | 'sent_at'>>

export type UpdateUser = Partial<Omit<InsertUser, 'id'>>
export type UpdatePractitioner = Partial<Omit<PractitionerRow, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type UpdateClient = Partial<Omit<ClientRow, 'id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
export type UpdateService = Partial<Omit<ServiceRow, 'id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
export type UpdateAppointment = Partial<Omit<AppointmentRow, 'id' | 'practitioner_id' | 'client_id' | 'created_at' | 'updated_at'>>
export type UpdateInvoice = Partial<Omit<InvoiceRow, 'id' | 'practitioner_id' | 'client_id' | 'created_at' | 'updated_at'>>
export type UpdateOrgSettings = Partial<Omit<OrgSettingsRow, 'id' | 'practitioner_id' | 'created_at' | 'updated_at'>>


// ---------------------------------------------------------------------------
// Database interface — must satisfy supabase-js v2 generic constraints.
// Every table needs Relationships; the schema needs Views/Functions/CompositeTypes.
// ---------------------------------------------------------------------------
export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow
        Insert: InsertUser
        Update: UpdateUser
        Relationships: []
      }
      practitioners: {
        Row: PractitionerRow
        Insert: InsertPractitioner
        Update: UpdatePractitioner
        Relationships: []
      }
      clients: {
        Row: ClientRow
        Insert: InsertClient
        Update: UpdateClient
        Relationships: [
          {
            foreignKeyName: 'clients_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          }
        ]
      }
      services: {
        Row: ServiceRow
        Insert: InsertService
        Update: UpdateService
        Relationships: [
          {
            foreignKeyName: 'services_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          }
        ]
      }
      ndis_price_guide: {
        Row: NdisPriceGuideRow
        Insert: InsertNdisPriceGuide
        Update: UpdateNdisPriceGuide
        Relationships: []
      }
      availability_rules: {
        Row: AvailabilityRuleRow
        Insert: InsertAvailabilityRule
        Update: Partial<Omit<AvailabilityRuleRow, 'id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
        Relationships: [
          {
            foreignKeyName: 'availability_rules_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          }
        ]
      }
      blocked_times: {
        Row: BlockedTimeRow
        Insert: InsertBlockedTime
        Update: Partial<Omit<BlockedTimeRow, 'id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
        Relationships: [
          {
            foreignKeyName: 'blocked_times_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          }
        ]
      }
      appointments: {
        Row: AppointmentRow
        Insert: InsertAppointment
        Update: UpdateAppointment
        Relationships: [
          {
            foreignKeyName: 'appointments_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'appointments_service_id_fkey'
            columns: ['service_id']
            isOneToOne: false
            referencedRelation: 'services'
            referencedColumns: ['id']
          }
        ]
      }
      session_notes: {
        Row: SessionNoteRow
        Insert: InsertSessionNote
        Update: Partial<Omit<SessionNoteRow, 'id' | 'appointment_id' | 'practitioner_id' | 'created_at' | 'updated_at'>>
        Relationships: [
          {
            foreignKeyName: 'session_notes_appointment_id_fkey'
            columns: ['appointment_id']
            isOneToOne: false
            referencedRelation: 'appointments'
            referencedColumns: ['id']
          }
        ]
      }
      reports: {
        Row: ReportRow
        Insert: InsertReport
        Update: Partial<Omit<ReportRow, 'id' | 'practitioner_id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'reports_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          }
        ]
      }
      invoices: {
        Row: InvoiceRow
        Insert: InsertInvoice
        Update: UpdateInvoice
        Relationships: [
          {
            foreignKeyName: 'invoices_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'invoices_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          }
        ]
      }
      invoice_items: {
        Row: InvoiceItemRow
        Insert: InsertInvoiceItem
        Update: Partial<Omit<InvoiceItemRow, 'id' | 'invoice_id' | 'total_cents' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'invoice_items_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          }
        ]
      }
      invoice_audit_log: {
        Row: InvoiceAuditLogRow
        Insert: InsertInvoiceAuditLog
        Update: Partial<Omit<InvoiceAuditLogRow, 'id' | 'invoice_id' | 'practitioner_id' | 'edited_at'>>
        Relationships: [
          {
            foreignKeyName: 'invoice_audit_log_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          }
        ]
      }
      organisation_settings: {
        Row: OrgSettingsRow
        Insert: InsertOrgSettings
        Update: UpdateOrgSettings
        Relationships: [
          {
            foreignKeyName: 'organisation_settings_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: true
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          }
        ]
      }
      sessions: {
        Row: SessionRow
        Insert: InsertSession
        Update: UpdateSession
        Relationships: [
          {
            foreignKeyName: 'sessions_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_client_id_fkey'
            columns: ['client_id']
            isOneToOne: false
            referencedRelation: 'clients'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sessions_invoice_id_fkey'
            columns: ['invoice_id']
            isOneToOne: false
            referencedRelation: 'invoices'
            referencedColumns: ['id']
          }
        ]
      }
      session_notifications: {
        Row: SessionNotificationRow
        Insert: InsertSessionNotification
        Update: UpdateSessionNotification
        Relationships: [
          {
            foreignKeyName: 'session_notifications_practitioner_id_fkey'
            columns: ['practitioner_id']
            isOneToOne: false
            referencedRelation: 'practitioners'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'session_notifications_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'sessions'
            referencedColumns: ['id']
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      appointment_status: AppointmentStatus
      invoice_status: InvoiceStatus
      report_type: ReportType
      session_status: SessionStatus
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
