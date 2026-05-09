import Card from '@/components/ui/Card'

function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

export default function ReportsLoading() {
  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <Bone className="h-7 w-24" />
        <Bone className="h-4 w-64" />
      </div>

      {/* Period filter */}
      <div className="flex gap-2">
        {[0, 1, 2, 3].map((i) => (
          <Bone key={i} className="h-8 w-24" />
        ))}
      </div>

      {/* Report cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} padding="md" className="flex flex-col gap-4">
            <div className="space-y-1.5">
              <Bone className="h-4 w-36" />
              <Bone className="h-3 w-full" />
              <Bone className="h-3 w-3/4" />
            </div>
            <div className="flex gap-1.5">
              <Bone className="h-6 w-20" />
              <Bone className="h-6 w-24" />
            </div>
            <div className="border-t border-gray-50 pt-1">
              <Bone className="h-9 w-28" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
