import { NavLink } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';

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
          placeItems: 'center', flexShrink: 0,
          background: '#FFC107',
        }}>
          <img src="/brand/abhicabs-mark.svg" alt="ABHI CABS" style={{ height: 24, width: 24 }} />
        </div>
        <div style={{ minWidth: 0 }}>
          {/* Brand guide: "ABHI" is Montserrat Bold, "CABS" is SF Pro
              Display Medium — previously the whole string used one
              generic uppercase weight with no Montserrat loaded at all. */}
          <p style={{ color: '#fff', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', lineHeight: 1 }}>
            <span style={{ fontFamily: 'var(--font-brand)', fontWeight: 700 }}>ABHI</span>{' '}
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 500 }}>CABS</span>
          </p>
          <p style={{ fontSize: 11.5, marginTop: 3, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, color: '#FFC107' }}>
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
                fontSize: 13.5, fontWeight: 600, letterSpacing: '0.01em',
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
        <p style={{ fontSize: 11.5, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 600, color: '#444' }}>
          © 2026 ABHI CABS
        </p>
        <p style={{ fontSize: 11.5, marginTop: 2, fontWeight: 700, color: '#FFC107' }}>
          Ride With Trust
        </p>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar — fixed, but only from the lg breakpoint up.
          FIX: this previously had no responsive hiding at all (no `hidden
          lg:flex`), so it was permanently visible and permanently reserved
          240px on every screen size, phones included — while the separate
          mobile overlay sidebar below could ALSO open on top of it. The
          hamburger button in Navbar.jsx already correctly used `lg:hidden`;
          this was the missing other half of that same breakpoint contract. */}
      <aside className="hidden lg:flex" style={{
        width: SIDEBAR_W, position: 'fixed', left: 0, top: 0, bottom: 0,
        zIndex: 20, backgroundColor: '#111111', flexDirection: 'column',
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
