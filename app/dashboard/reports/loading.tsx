function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">{children}</div>
}

function ReportCardSkeleton() {
  return (
    <div className="flex flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <Bone className="h-8 w-8 shrink-0 rounded-lg" />
        <Bone className="h-4 w-32" />
      </div>
      <div className="mb-4 flex-1 space-y-1.5">
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-4/5" />
      </div>
      <div className="mb-4">
        <Bone className="h-7 w-24" />
        <Bone className="mt-1 h-3 w-20" />
      </div>
      <div className="flex gap-2 border-t border-gray-50 pt-3">
        <Bone className="h-7 flex-1" />
        <Bone className="h-7 flex-1" />
      </div>
    </div>
  )
}

function SectionSkeleton({ cards = 3, panels = 2 }: { cards?: number; panels?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Bone className="h-8 w-8 shrink-0 rounded-lg" />
        <div className="space-y-1.5">
          <Bone className="h-4 w-36" />
          <Bone className="h-3 w-56" />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => <ReportCardSkeleton key={i} />)}
      </div>
      {panels > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: panels }).map((_, i) => (
            <Panel key={i}>
              <Bone className="mb-3 h-4 w-36" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => <Bone key={j} className="h-9 w-full" />)}
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ReportsLoading() {
  return (
    <div className="space-y-10">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <Bone className="h-7 w-20" />
          <Bone className="h-4 w-80" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(i => <Bone key={i} className="h-8 w-24" />)}
        </div>
      </div>

      {/* Insight strip */}
      <div>
        <Bone className="mb-3 h-3 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Bone className="h-9 w-9 shrink-0 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-3 w-16" />
                  <Bone className="h-5 w-14" />
                  <Bone className="h-3 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Reports */}
      <SectionSkeleton cards={3} panels={2} />

      {/* Operational Reports */}
      <SectionSkeleton cards={3} panels={1} />

      {/* Compliance */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Bone className="h-8 w-8 shrink-0 rounded-lg" />
          <div className="space-y-1.5">
            <Bone className="h-4 w-44" />
            <Bone className="h-3 w-64" />
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <ReportCardSkeleton />
          <div className="grid grid-cols-2 gap-3 lg:col-span-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 space-y-2">
                <Bone className="h-3 w-28" />
                <Bone className="h-8 w-12" />
                <Bone className="h-3 w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map(i => (
            <Panel key={i}>
              <Bone className="mb-3 h-4 w-36" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => <Bone key={j} className="h-9 w-full" />)}
              </div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Client Reports */}
      <SectionSkeleton cards={3} panels={0} />

    </div>
  )
}
