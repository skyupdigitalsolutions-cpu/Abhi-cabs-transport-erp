import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { APP_NAME } from '../../constants';

const SIDEBAR_W = 240;

export default function Sidebar({ nav, mobileOpen, onCloseMobile }) {
  const { hasPermission } = useAuth();
  const items = nav.filter((item) => hasPermission(item.permission));

  const content = (
    <>
      {/* Brand */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 20px', height: 64, flexShrink: 0,
        borderBottom: '1px solid rgba(255,193,7,0.15)',
      }}>
        <div style={{
          height: 36, width: 36, borderRadius: 10, display: 'grid',
          placeItems: 'center', flexShrink: 0, fontWeight: 900,
          fontSize: 13, background: '#FFC107', color: '#111111',
        }}>
          AC
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 900, color: '#fff', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
            {APP_NAME}
          </p>
          <p style={{ fontSize: 10, marginTop: 3, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: '#FFC107' }}>
            Transport ERP
          </p>
        </div>
      </div>

      {/* Nav items */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((item) => {
          const Icon = Icons[item.icon] || Icons.Circle;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onCloseMobile}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                borderRadius: 8, padding: '9px 12px',
                fontSize: 12, fontWeight: 600, letterSpacing: '0.01em',
                textDecoration: 'none', transition: 'background 0.12s',
                backgroundColor: isActive ? '#FFC107' : 'transparent',
                color: isActive ? '#111111' : '#888888',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.backgroundColor.includes('FFC107')) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.color = '#ffffff';
                }
              }}
              onMouseLeave={(e) => {
                if (!e.currentTarget.style.backgroundColor.includes('FFC107')) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#888888';
                }
              }}
            >
              <Icon size={15} strokeWidth={2} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 20px', flexShrink: 0, borderTop: '1px solid rgba(255,193,7,0.1)' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: '#444' }}>
          © 2026 ABHI CABS
        </p>
        <p style={{ fontSize: 10, marginTop: 2, fontWeight: 700, color: '#FFC107' }}>
          Ride With Trust
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — always visible, fixed */}
      <aside style={{
        width: SIDEBAR_W, position: 'fixed', left: 0, top: 0, bottom: 0,
        zIndex: 20, backgroundColor: '#111111', display: 'flex', flexDirection: 'column',
      }}>
        {content}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 40, display: 'flex' }}>
          <div
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)' }}
            onClick={onCloseMobile}
          />
          <aside style={{
            position: 'relative', width: SIDEBAR_W, height: '100%',
            zIndex: 10, backgroundColor: '#111111', display: 'flex', flexDirection: 'column',
          }}>
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
