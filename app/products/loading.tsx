export default function Loading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="skeleton h-8 w-56 rounded" />
      <div className="skeleton h-10 w-full rounded-[12px]" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="skeleton h-14 w-full rounded-[12px]" />
      ))}
    </div>
  );
}
