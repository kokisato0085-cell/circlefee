export default function Loading() {
  return (
    <div className="flex min-h-full flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="h-10 bg-gray-200 rounded animate-pulse" />
        <div className="h-32 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-40 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
}
