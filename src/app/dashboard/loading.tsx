export default function DashboardLoading() {
  return (
    <div
      className="min-h-screen bg-[#fafafa]"
      role="status"
      aria-label="Loading dashboard"
    >
      {/* Header Skeleton */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
      </header>

      {/* Content Skeleton */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2"></div>
          <div className="h-5 w-96 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-6">
              <div className="w-8 h-8 bg-gray-200 rounded mx-auto mb-3 animate-pulse"></div>
              <div className="h-5 w-24 bg-gray-200 rounded mx-auto mb-2 animate-pulse"></div>
              <div className="h-4 w-32 bg-gray-200 rounded mx-auto animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg border p-6">
              <div className="h-4 w-20 bg-gray-200 rounded mb-4 animate-pulse"></div>
              <div className="h-9 w-16 bg-gray-200 rounded mb-2 animate-pulse"></div>
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
