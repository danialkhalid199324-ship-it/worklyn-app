// Shim so @supabase/ssr@0.5.x can resolve its internal import of
// '@supabase/supabase-js/dist/module/lib/types', which no longer exists
// in @supabase/supabase-js@2.60+.
// Redirected via tsconfig.json "paths".

export type { SupabaseClientOptions } from '@supabase/supabase-js'

type GenericRelationship = {
  foreignKeyName: string
  columns: string[]
  isOneToOne?: boolean
  referencedRelation: string
  referencedColumns: string[]
}

type GenericTable = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: GenericRelationship[]
}

type GenericUpdatableView = {
  Row: Record<string, unknown>
  Insert: Record<string, unknown>
  Update: Record<string, unknown>
  Relationships: GenericRelationship[]
}

type GenericNonUpdatableView = {
  Row: Record<string, unknown>
}

type GenericView = GenericUpdatableView | GenericNonUpdatableView

type GenericFunction = {
  Args: Record<string, unknown>
  Returns: unknown
}

export type GenericSchema = {
  Tables: Record<string, GenericTable>
  Views: Record<string, GenericView>
  Functions: Record<string, GenericFunction>
}
