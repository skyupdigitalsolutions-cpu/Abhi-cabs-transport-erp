/** PageHeader — MUI <Typography> title block. Same props: title, description, actions, breadcrumb. */
import Typography from '@mui/material/Typography';

export default function PageHeader({ title, description, actions, breadcrumb }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        {breadcrumb && <div style={{ marginBottom: 8 }}>{breadcrumb}</div>}
        <Typography component="h1" sx={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1.2, color: '#111' }}>
          {title}
        </Typography>
        {description && (
          <Typography sx={{ mt: 0.5, fontSize: 13.5, fontWeight: 500, color: '#8A8A85', maxWidth: 600, lineHeight: 1.6 }}>
            {description}
          </Typography>
        )}
      </div>
      {actions && <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>{actions}</div>}
    </div>
  );
}
