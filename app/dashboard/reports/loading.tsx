import Card from '@/components/ui/Card'

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

export default function ReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Bone className="h-7 w-24" />
        <Bone className="h-4 w-48" />
      </div>

      {/* Period filter buttons */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-8 w-24" />
        ))}
      </div>

      {/* KPI strip */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="md" className="space-y-2">
            <Bone className="h-3 w-20" />
            <Bone className="h-8 w-24" />
            <Bone className="h-3 w-28" />
          </Card>
        ))}
      </div>

      {/* Chart card */}
      <Card>
        <Bone className="h-5 w-36 mb-4" />
        <Bone className="h-36 w-full" />
      </Card>

      {/* Report cards */}
      <div>
        <Bone className="h-4 w-28 mb-3" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <Bone className="h-8 w-8 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-48" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
