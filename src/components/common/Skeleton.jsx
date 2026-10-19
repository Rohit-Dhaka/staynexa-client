export const Skeleton = ({ className = "" }) => (
  <div className={`animate-pulse rounded-md bg-slate-200/80 ${className}`} />
);

export const SummaryCardsSkeleton = ({ count = 7 }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="rounded-xl border border-slate-200 bg-white p-4"
      >
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-3 h-7 w-10" />
      </div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 6, columns = 6 }) => (
  <div className="overflow-x-auto" aria-busy="true" aria-live="polite">
    <table className="w-full text-left text-sm">
      <thead className="bg-slate-50">
        <tr>
          {Array.from({ length: columns }).map((_, index) => (
            <th key={index} className="px-4 py-3">
              <Skeleton className="h-3 w-16" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <tr key={rowIndex}>
            {Array.from({ length: columns }).map((__, colIndex) => (
              <td key={colIndex} className="px-4 py-4">
                <Skeleton
                  className={`h-4 ${colIndex === 0 ? "w-20" : "w-full max-w-[120px]"}`}
                />
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const FormSkeleton = ({ fields = 6 }) => (
  <div className="space-y-5" aria-busy="true" aria-live="polite">
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      {Array.from({ length: fields }).map((_, index) => (
        <div key={index}>
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-2 h-10 w-full" />
        </div>
      ))}
    </div>
    <div className="flex justify-end gap-3 pt-2">
      <Skeleton className="h-10 w-24" />
      <Skeleton className="h-10 w-28" />
    </div>
  </div>
);

export default Skeleton;