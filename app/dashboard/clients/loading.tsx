import Card from '@/components/ui/Card'

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

export default function ClientsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-24" />
        <Bone className="h-9 w-28" />
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-3">
        <Bone className="h-9 flex-1 max-w-xs" />
        <Bone className="h-9 w-32" />
      </div>

      {/* Client cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Card key={i} padding="md" className="space-y-3">
            <div className="flex items-center gap-3">
              <Bone className="h-10 w-10 rounded-full" />
              <div className="space-y-1.5 flex-1">
                <Bone className="h-4 w-32" />
                <Bone className="h-3 w-20" />
              </div>
            </div>
            <div className="flex gap-2">
              <Bone className="h-5 w-16 rounded-full" />
              <Bone className="h-5 w-20 rounded-full" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
