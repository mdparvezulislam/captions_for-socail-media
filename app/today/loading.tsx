export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <div className="skeleton h-3 w-40 rounded" />
        <div className="skeleton h-8 w-[280px] rounded" />
        <div className="skeleton h-3 w-[420px] max-w-full rounded" />
        <div className="flex gap-2 pt-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="skeleton h-8 w-28 rounded-full" />
          ))}
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <div key={i} className="card-surface flex flex-col gap-3 p-4">
          <div className="flex gap-3">
            <div className="skeleton h-16 w-16 rounded-[16px]" />
            <div className="flex flex-1 flex-col gap-2">
              <div className="skeleton h-4 w-2/3 rounded" />
              <div className="skeleton h-3 w-1/3 rounded" />
            </div>
          </div>
          <div className="skeleton h-24 w-full rounded-[14px]" />
          <div className="flex gap-2">
            <div className="skeleton h-9 w-28 rounded-[12px]" />
            <div className="skeleton h-9 w-24 rounded-[12px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
