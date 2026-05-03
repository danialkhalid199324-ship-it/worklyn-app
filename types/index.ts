// Re-export all database types for convenient imports
export * from './database'

// ---------------------------------------------------------------------------
// App-level types (not tied to DB rows)
// ---------------------------------------------------------------------------
export interface NavItem {
  href: string
  label: string
  icon?: string
}

export interface SelectOption<T = string> {
  value: T
  label: string
}

export interface PaginatedResult<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
}
