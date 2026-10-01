import { NavLink, useLocation } from 'react-router-dom';
import MuiDrawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Chip from '@mui/material/Chip';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import BadgeRoundedIcon from '@mui/icons-material/BadgeRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import InboxRoundedIcon from '@mui/icons-material/InboxRounded';
import SensorsRoundedIcon from '@mui/icons-material/SensorsRounded';
import AltRouteRoundedIcon from '@mui/icons-material/AltRouteRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import InsightsRoundedIcon from '@mui/icons-material/InsightsRounded';
import PriceChangeRoundedIcon from '@mui/icons-material/PriceChangeRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import AdminPanelSettingsRoundedIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import FiberManualRecordRoundedIcon from '@mui/icons-material/FiberManualRecordRounded';
import { useAuth } from '../../hooks/useAuth';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';

const SIDEBAR_W = 240;

// Nav icons from @mui/icons-material (Rounded set). constants/index.js still
// names them by their lucide names, so the mapping lives here; an unknown
// name falls back to a dot rather than breaking the menu.
const NAV_ICONS = {
  LayoutDashboard: DashboardRoundedIcon,
  Users: PeopleAltRoundedIcon,
  IdCard: BadgeRoundedIcon,
  Truck: LocalShippingRoundedIcon,
  CalendarCheck: EventAvailableRoundedIcon,
  Inbox: InboxRoundedIcon,
  Radio: SensorsRoundedIcon,
  Route: AltRouteRoundedIcon,
  MapPin: PlaceRoundedIcon,
  CreditCard: CreditCardRoundedIcon,
  FileText: DescriptionRoundedIcon,
  BarChart3: InsightsRoundedIcon,
  Database: PriceChangeRoundedIcon,
  Bell: NotificationsRoundedIcon,
  LifeBuoy: SupportAgentRoundedIcon,
  MessageCircle: WhatsAppIcon,
  Tag: LocalOfferRoundedIcon,
  ShieldCheck: AdminPanelSettingsRoundedIcon,
  Settings: SettingsRoundedIcon,
  User: PersonRoundedIcon,
};

/** One nav row: MUI ListItemButton rendered as a router NavLink. */
function NavItem({ item, badge, onCloseMobile }) {
  const location = useLocation();
  const active = location.pathname === item.to || location.pathname.startsWith(`${item.to}/`);
  const Icon = NAV_ICONS[item.icon] || FiberManualRecordRoundedIcon;
  return (
    <ListItemButton
      component={NavLink}
      to={item.to}
      onClick={onCloseMobile}
      selected={active}
      sx={{
        py: 1, px: 1.5, gap: 1.25, color: '#9A9A95',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.07)', color: '#fff' },
        '&.Mui-selected': { bgcolor: '#FFC107', color: '#111', boxShadow: '0 4px 14px rgba(255,193,7,.25)' },
        '&.Mui-selected:hover': { bgcolor: '#FFCA2C' },
      }}
    >
      <Icon sx={{ fontSize: 19 }} />
      <ListItemText primary={item.label} slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: 650 } } }} />
      {badge > 0 && <Chip size="small" label={badge > 99 ? '99+' : badge} aria-label={`${badge} new`} sx={{ bgcolor: '#EF4444', color: '#fff', height: 20, fontSize: 11 }} />}
    </ListItemButton>
  );
}

export default function Sidebar({ nav, mobileOpen, onCloseMobile }) {
  const { hasPermission } = useAuth();
  const { newRequestCount } = useAdminRealtimeContext();
  const items = nav.filter((item) => hasPermission(item.permission));
  // Live counts shown next to a nav item.
  const badges = { '/admin/booking-requests': newRequestCount };

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
      <List component="nav" sx={{ flex: 1, overflowY: 'auto', px: 1, py: 1.5, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
        {items.map((item) => (
          <NavItem key={item.to} item={item} badge={badges[item.to] || 0} onCloseMobile={onCloseMobile} />
        ))}
      </List>

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

      {/* Mobile: MUI temporary drawer */}
      <MuiDrawer
        open={!!mobileOpen}
        onClose={onCloseMobile}
        className="lg:hidden"
        slotProps={{ paper: { sx: { width: SIDEBAR_W, bgcolor: '#111111', display: 'flex', flexDirection: 'column', borderRight: 0 } } }}
      >
        {content}
      </MuiDrawer>
    </>
  );
}
