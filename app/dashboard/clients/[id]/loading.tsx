import Card from '@/components/ui/Card'

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

export default function ClientDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Client header */}
      <div className="flex items-start gap-4">
        <Bone className="h-14 w-14 rounded-full" />
        <div className="space-y-2 flex-1">
          <Bone className="h-6 w-40" />
          <Bone className="h-4 w-24" />
          <div className="flex gap-2 mt-1">
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="h-5 w-20 rounded-full" />
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100 pb-0">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-9 w-24 rounded-t-lg" />
        ))}
      </div>

      {/* Tab content — timeline rows */}
      <Card className="divide-y divide-gray-50">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 py-3.5">
            <Bone className="h-4 w-20" />
            <Bone className="h-4 w-28" />
            <Bone className="h-5 w-16 rounded-full" />
            <Bone className="ml-auto h-4 w-14" />
          </div>
        ))}
      </Card>
    </div>
  )
}
