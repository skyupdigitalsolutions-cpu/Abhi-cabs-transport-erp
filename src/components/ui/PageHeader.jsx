export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: 4,
      marginBottom: 24,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          {breadcrumb && <div style={{ marginBottom: 8 }}>{breadcrumb}</div>}
          <h1 style={{
            fontSize: 22, fontWeight: 900, color: '#111111',
            letterSpacing: '-0.5px', lineHeight: 1.2, margin: 0,
          }}>
            {title}
          </h1>
          {description && (
            <p style={{ marginTop: 4, fontSize: 12, fontWeight: 500, color: '#9A9A9A', maxWidth: 560, lineHeight: 1.6 }}>
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
