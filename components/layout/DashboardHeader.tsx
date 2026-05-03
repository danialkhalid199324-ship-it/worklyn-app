import { logout } from '@/app/actions/auth'
import { getUser } from '@/lib/auth'
import { getPractitionerByUserId, getOrgSettings } from '@/lib/db'

export default async function DashboardHeader() {
  const user = await getUser()
  let initials = 'P'
  let displayName = 'Practitioner'
  let logoUrl: string | null = null

  if (user) {
    try {
      const p = await getPractitionerByUserId(user.id)
      displayName = p.display_name ?? `${p.first_name} ${p.last_name}`
      initials = `${p.first_name[0]}${p.last_name[0]}`.toUpperCase()
      const org = await getOrgSettings(p.id)
      logoUrl = org?.logo_url ?? null
    } catch {
      // practitioner row not yet created — use email
      displayName = user.email?.split('@')[0] ?? 'User'
      initials = displayName[0].toUpperCase()
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Page title slot filled by layouts */}
      <div id="page-title" />

      <div className="flex items-center gap-3">
        {/* Notifications bell (placeholder) */}
        <button
          aria-label="Notifications"
          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5 border-l border-gray-200 pl-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Organisation logo" className="h-8 w-8 object-cover" />
            ) : (
              <span className="text-xs font-bold text-brand-700">{initials}</span>
            )}
          </div>
          <span className="hidden text-sm font-medium text-gray-700 sm:block">
            {displayName}
          </span>
        </div>

        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg px-3 py-1.5 text-sm text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
          >
            Sign out
          </button>
        </form>
      </div>
    </header>
  )
}
