export default function ReportsLoading() {
  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* heading */}
      <div className="h-7 w-44 bg-gray-200 rounded-md animate-pulse" />

      {/* filter bar */}
      <div className="h-32 bg-gray-100 rounded-xl animate-pulse" />

      {/* export button */}
      <div className="flex justify-end">
        <div className="h-9 w-44 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      {/* summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>

      {/* table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="h-10 bg-gray-50 border-b border-gray-200" />
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-12 border-b border-gray-100 px-4 flex items-center">
            <div
              className="h-4 bg-gray-100 rounded animate-pulse"
              style={{ width: `${50 + (i % 4) * 12}%` }}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
