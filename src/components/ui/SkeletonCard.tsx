export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-title" />
      <div className="skeleton skeleton-text" />
      <div className="skeleton skeleton-text short" />
      <div className="skeleton-row">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-hourly" />
        ))}
      </div>
    </div>
  );
}