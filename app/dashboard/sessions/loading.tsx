import Card from '@/components/ui/Card'

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

export default function SessionsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-28" />
        <Bone className="h-9 w-32" />
      </div>

      {/* Stats strip */}
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i} padding="md" className="space-y-2">
            <Bone className="h-3 w-24" />
            <Bone className="h-7 w-12" />
          </Card>
        ))}
      </div>

      {/* Table card */}
      <Card className="divide-y divide-gray-50">
        <div className="flex gap-4 pb-3">
          <Bone className="h-8 w-48" />
          <Bone className="h-8 w-32" />
        </div>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3.5">
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-20" />
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="ml-auto h-4 w-14" />
          </div>
        ))}
      </Card>
    </div>
  )
}
