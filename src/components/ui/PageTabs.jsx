/**
 * PageTabs — MUI <Tabs> for switching sections inside a page.
 *   tabs: [{ key, label, icon?: lucide component, badge?: number }]
 *   value: active key, onChange(key)
 */
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Chip from '@mui/material/Chip';

export default function PageTabs({ tabs, value, onChange }) {
  return (
    <Tabs
      value={value}
      onChange={(_e, v) => onChange(v)}
      variant="scrollable"
      scrollButtons="auto"
      sx={{ mb: 2.5, borderBottom: '1.5px solid #E8E8E4', '& .MuiTab-root': { color: '#6B7280' }, '& .Mui-selected': { color: '#111 !important' } }}
    >
      {tabs.map((t) => (
        <Tab
          key={t.key}
          value={t.key}
          iconPosition="start"
          icon={t.icon ? <t.icon size={15} /> : undefined}
          label={(
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {t.label}
              {t.badge > 0 && <Chip size="small" label={t.badge} sx={{ height: 18, fontSize: 11, bgcolor: '#FEF3C7', color: '#92400E' }} />}
            </span>
          )}
          sx={{ gap: 0.75, minHeight: 48 }}
        />
      ))}
    </Tabs>
  );
}
