export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
      <div>
        {breadcrumb}
        <h1
          className="text-xl sm:text-2xl font-extrabold tracking-tight"
          style={{ color: '#111111', letterSpacing: '-0.5px' }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-xs font-medium" style={{ color: '#9A9A9A' }}>
            {description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 sm:shrink-0">{actions}</div>}
    </div>
  );
}
