import Card from '@/components/ui/Card'

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <Bone className="h-3 w-48" />
          <Bone className="h-7 w-24" />
        </div>
        <Bone className="h-9 w-36" />
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="md" className="space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-8 w-16" />
            <Bone className="h-3 w-32" />
          </Card>
        ))}
      </div>

      {/* Two-column section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Today's sessions */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <Bone className="h-5 w-36" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-20" />
                </div>
                <Bone className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </Card>

        {/* Outstanding invoices */}
        <Card padding="md" className="space-y-4">
          <div className="flex items-center justify-between">
            <Bone className="h-5 w-44" />
            <Bone className="h-5 w-20 rounded-full" />
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="flex-1 space-y-1.5">
                  <Bone className="h-4 w-28" />
                  <Bone className="h-3 w-20" />
                </div>
                <Bone className="h-5 w-16" />
                <Bone className="h-5 w-14 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Upcoming sessions */}
      <Card padding="md" className="space-y-4">
        <Bone className="h-5 w-40" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="space-y-2 rounded-lg border border-gray-100 p-3">
              <Bone className="h-3 w-20" />
              <Bone className="h-4 w-28" />
              <Bone className="h-3 w-16" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
