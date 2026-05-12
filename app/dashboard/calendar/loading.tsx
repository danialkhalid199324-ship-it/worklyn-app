function Bone({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-gray-100 ${className ?? ''}`} />
}

export default function CalendarLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Bone className="h-7 w-24" />
        <div className="flex gap-2">
          <Bone className="h-9 w-9 rounded-lg" />
          <Bone className="h-9 w-28" />
          <Bone className="h-9 w-9 rounded-lg" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-20 rounded-lg" />
          <Bone className="h-9 w-20 rounded-lg" />
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-3 text-center">
              <Bone className="h-3 w-8 mx-auto" />
            </div>
          ))}
        </div>

        {/* Calendar cells — 5 rows × 7 columns */}
        {[0, 1, 2, 3, 4].map((row) => (
          <div key={row} className="grid grid-cols-7 border-b border-gray-100 last:border-0">
            {[0, 1, 2, 3, 4, 5, 6].map((col) => (
              <div key={col} className="min-h-[100px] p-2 border-r border-gray-100 last:border-0 space-y-1.5">
                <Bone className="h-5 w-5 rounded-full" />
                {(row + col) % 3 === 0 && <Bone className="h-6 w-full rounded-md" />}
                {(row + col) % 5 === 0 && <Bone className="h-6 w-4/5 rounded-md" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
