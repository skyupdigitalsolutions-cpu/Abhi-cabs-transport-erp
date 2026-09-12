export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div className="min-w-0">
        {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
        <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-tight"
          style={{ color: '#111111', letterSpacing: '-0.5px' }}>
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs font-medium leading-relaxed" style={{ color: '#9A9A9A', maxWidth: 560 }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 mt-2 sm:mt-0 sm:shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
}
