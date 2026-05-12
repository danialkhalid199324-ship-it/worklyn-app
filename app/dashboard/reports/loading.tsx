function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">{children}</div>
}

export default function ReportsLoading() {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <Bone className="h-7 w-24" />
          <Bone className="h-4 w-80" />
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2, 3].map(i => <Bone key={i} className="h-8 w-24" />)}
        </div>
      </div>

      {/* KPI row */}
      <div>
        <Bone className="mb-4 h-4 w-20" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm space-y-2">
              <Bone className="h-3 w-24" />
              <Bone className="h-8 w-20" />
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Finance */}
      <div>
        <Bone className="mb-4 h-4 w-16" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Panel key={i}>
              <div className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-7 w-28" />
                <Bone className="h-3 w-16" />
              </div>
            </Panel>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map(i => (
            <Panel key={i}>
              <Bone className="mb-3 h-4 w-32" />
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, j) => <Bone key={j} className="h-9 w-full" />)}
              </div>
            </Panel>
          ))}
        </div>
      </div>

      {/* Operations */}
      <div>
        <Bone className="mb-4 h-4 w-20" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Panel key={i}>
              <div className="space-y-2">
                <Bone className="h-3 w-20" />
                <Bone className="h-8 w-12" />
                <Bone className="h-3 w-24" />
              </div>
            </Panel>
          ))}
        </div>
        <Panel>
          <Bone className="mb-3 h-4 w-40" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-9 w-full" />)}
          </div>
        </Panel>
      </div>

      {/* Compliance */}
      <div>
        <Bone className="mb-4 h-4 w-36" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-4 space-y-2">
              <Bone className="h-3 w-28" />
              <Bone className="h-9 w-12" />
              <Bone className="h-3 w-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {[0, 1].map(i => (
            <Panel key={i}>
              <Bone className="mb-3 h-4 w-36" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, j) => <Bone key={j} className="h-9 w-full" />)}
              </div>
            </Panel>
          ))}
        </div>
      </div>

    </div>
  )
}
