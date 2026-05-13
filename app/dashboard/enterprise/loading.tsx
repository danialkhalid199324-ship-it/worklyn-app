function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">{children}</div>
}

export default function EnterpriseLoading() {
  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <Bone className="h-7 w-64" />
          <Bone className="h-4 w-96" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[0, 1, 2, 3, 4, 5].map(i => <Bone key={i} className="h-8 w-24" />)}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <Bone className="mb-2 h-8 w-8 rounded-lg" />
            <Bone className="h-6 w-16" />
            <Bone className="mt-1 h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Business Health */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <Bone className="mb-3 h-4 w-32" />
            <Bone className="h-6 w-24" />
            <Bone className="mt-2 h-3 w-full" />
            <Bone className="mt-1 h-3 w-4/5" />
          </Card>
        ))}
      </div>

      {/* Performance + Compliance */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Bone className="mb-4 h-5 w-48" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-1.5">
                <Bone className="h-6 w-12" />
                <Bone className="h-3 w-20" />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <Bone className="mb-4 h-5 w-48" />
          <div className="space-y-2.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-1">
                  <Bone className="h-3 w-40" />
                  <Bone className="h-3 w-24" />
                </div>
                <Bone className="h-6 w-8" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Client Risk + Automation */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <Bone className="mb-4 h-5 w-36" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Bone key={i} className="h-10 w-full" />)}
          </div>
        </Card>
        <Card>
          <Bone className="mb-4 h-5 w-36" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-10 w-full" />)}
          </div>
        </Card>
      </div>

    </div>
  )
}
