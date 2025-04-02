export default function LoadingMap() {
  return (
    <div className="flex items-center justify-center w-full h-full bg-gray-100 dark:bg-gray-900">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="text-lg font-medium">Loading map...</p>
      </div>
    </div>
  )
}

