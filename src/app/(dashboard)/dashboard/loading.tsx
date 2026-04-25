export default function DashboardLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="h-7 w-48 bg-gray-200 rounded-md animate-pulse mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl p-5 h-24 bg-gray-100 animate-pulse" />
        ))}
      </div>
    </div>
  )
}
