/**
 * WhatsApp page — real WhatsApp-style UI.
 * Left: contact/conversation list (customers who received messages).
 * Right: chat thread with inbound + outbound bubbles, reply box.
 * Bottom-left: Automation panel (templates, live log).
 */
import { useState, useRef, useEffect } from 'react';
import {
  Search, Send, Phone, MoreVertical, CheckCheck, Check,
  Zap, Clock, CheckCircle, XCircle, AlertTriangle,
  MessageCircle, ChevronDown, RefreshCw, BookOpen,
} from 'lucide-react';
import Badge        from '../../components/ui/Badge';
import Button       from '../../components/ui/Button';
import Alert        from '../../components/ui/Alert';
import { useAdminRealtimeContext } from '../../context/AdminRealtimeContext';
import { useToast } from '../../hooks/useToast';
import { formatDateTime } from '../../utils/formatters';

// ── Brand colours ─────────────────────────────────────────────────────────
const WA = {
  green:      '#25D366',
  greenDark:  '#128C7E',
  greenLight: '#DCF8C6',
  teal:       '#075E54',
  bg:         '#ECE5DD',
  panelBg:    '#F0F2F5',
  bubbleOut:  '#DCF8C6',
  bubbleIn:   '#FFFFFF',
  text:       '#111B21',
  sub:        '#667781',
  border:     '#E9EDEF',
  header:     '#F0F2F5',
};

// ── Mock conversations ────────────────────────────────────────────────────
const INIT_CONTACTS = [
  {
    id: '1', name: 'Ravi Kumar', phone: '+91 98765 43210', avatar: 'RK',
    lastMsg: 'Thank you! When will the driver arrive?', lastAt: new Date(Date.now() - 4 * 60000).toISOString(),
    unread: 2, online: true,
    messages: [
      { id: 'm1', from: 'out', text: '✅ Your ABHI CABS booking *ABH-2026-000123* has been confirmed.\n📍 Pickup: MG Road, Bengaluru\nOur driver will be assigned shortly.', at: new Date(Date.now() - 30 * 60000).toISOString(), status: 'read', template: 'booking_confirmed' },
      { id: 'm2', from: 'in',  text: 'Thank you for the confirmation!', at: new Date(Date.now() - 28 * 60000).toISOString() },
      { id: 'm3', from: 'out', text: '🚗 Your driver is on the way!\n\nBooking: *ABH-2026-000123*\nVehicle: KA-01-AB-1234 · Innova Crysta\n\nTrack your ride in the ABHI CABS app.', at: new Date(Date.now() - 15 * 60000).toISOString(), status: 'read', template: 'driver_assigned' },
      { id: 'm4', from: 'in',  text: 'Thank you! When will the driver arrive?', at: new Date(Date.now() - 4 * 60000).toISOString() },
    ],
  },
  {
    id: '2', name: 'Priya Singh', phone: '+91 99887 76655', avatar: 'PS',
    lastMsg: 'ABHICABS: Booking ABH-2026-000119 has been cancelled.', lastAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    unread: 0, online: false,
    messages: [
      { id: 'm5', from: 'out', text: 'ABHICABS: Booking ABH-2026-000119 has been cancelled. Refund of Rs.850 will be processed in 5-7 days. Helpline: 1800-XXX-XXXX', at: new Date(Date.now() - 2 * 3600000).toISOString(), status: 'delivered', template: 'booking_cancelled' },
    ],
  },
  {
    id: '3', name: 'Amit Sharma', phone: '+91 91234 56789', avatar: 'AS',
    lastMsg: 'Is my cab confirmed for tomorrow?', lastAt: new Date(Date.now() - 5 * 3600000).toISOString(),
    unread: 1, online: false,
    messages: [
      { id: 'm6', from: 'in', text: 'Is my cab confirmed for tomorrow?', at: new Date(Date.now() - 5 * 3600000).toISOString() },
    ],
  },
  {
    id: '4', name: 'Sneha Patel', phone: '+91 90001 11222', avatar: 'SP',
    lastMsg: '✅ Your ABHI CABS booking *ABH-2026-000131* has been confirmed.', lastAt: new Date(Date.now() - 10 * 60000).toISOString(),
    unread: 0, online: true,
    messages: [
      { id: 'm7', from: 'out', text: '✅ Your ABHI CABS booking *ABH-2026-000131* has been confirmed.\n📍 Pickup: Whitefield, Bengaluru\nOur driver will be assigned shortly.', at: new Date(Date.now() - 10 * 60000).toISOString(), status: 'read', template: 'booking_confirmed' },
    ],
  },
];

const TEMPLATES = [
  { key: 'booking_confirmed', label: 'Booking Confirmed', channel: 'whatsapp', trigger: 'Admin confirms booking', tone: 'green' },
  { key: 'driver_assigned',   label: 'Driver Assigned',   channel: 'whatsapp', trigger: 'Vehicle allocated',     tone: 'blue'  },
  { key: 'booking_cancelled', label: 'Booking Cancelled', channel: 'sms',      trigger: 'Booking cancelled',     tone: 'red'   },
];

// ── Helpers ───────────────────────────────────────────────────────────────
function timeShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function dateLabel(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  if (diff < 86400000 && d.getDate() === now.getDate()) return 'Today';
  if (diff < 172800000) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
}

function Avatar({ initials, size = 40, online = false }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: WA.teal, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.35, fontWeight: 700,
      }}>
        {initials}
      </div>
      {online && (
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: 10, height: 10, borderRadius: '50%',
          backgroundColor: WA.green, border: '2px solid #fff',
        }} />
      )}
    </div>
  );
}

function TickIcon({ status }) {
  if (status === 'read')      return <CheckCheck size={14} style={{ color: '#53BDEB' }} />;
  if (status === 'delivered') return <CheckCheck size={14} style={{ color: WA.sub }} />;
  return <Check size={14} style={{ color: WA.sub }} />;
}

// ── Contact row ───────────────────────────────────────────────────────────
function ContactRow({ contact, selected, onClick }) {
  return (
    <div onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        cursor: 'pointer', borderBottom: `1px solid ${WA.border}`,
        backgroundColor: selected ? '#F0F2F5' : '#fff',
        transition: 'background 0.1s',
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#F5F6F6'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.backgroundColor = '#fff'; }}
    >
      <Avatar initials={contact.avatar} online={contact.online} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: WA.text }}>{contact.name}</span>
          <span style={{ fontSize: 11, color: contact.unread > 0 ? WA.green : WA.sub, whiteSpace: 'nowrap' }}>
            {timeShort(contact.lastAt)}
          </span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: 13, color: WA.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 180 }}>
            {contact.lastMsg}
          </p>
          {contact.unread > 0 && (
            <span style={{
              backgroundColor: WA.green, color: '#fff', borderRadius: '50%',
              minWidth: 20, height: 20, fontSize: 11, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px', flexShrink: 0,
            }}>
              {contact.unread}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────────────────────────
function Bubble({ msg }) {
  const isOut = msg.from === 'out';
  return (
    <div style={{ display: 'flex', justifyContent: isOut ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
      <div style={{
        maxWidth: '65%', minWidth: 80,
        backgroundColor: isOut ? WA.bubbleOut : WA.bubbleIn,
        borderRadius: isOut ? '8px 0 8px 8px' : '0 8px 8px 8px',
        padding: '6px 10px 4px',
        boxShadow: '0 1px 0.5px rgba(11,20,26,.13)',
        position: 'relative',
      }}>
        {msg.template && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Zap size={10} style={{ color: '#F59E0B' }} />
            <span style={{ fontSize: 10, color: '#92400e', fontWeight: 600, fontFamily: 'monospace' }}>
              {msg.template}
            </span>
          </div>
        )}
        <p style={{ fontSize: 14, color: WA.text, whiteSpace: 'pre-wrap', lineHeight: 1.45 }}>
          {msg.text}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, marginTop: 2 }}>
          <span style={{ fontSize: 10, color: WA.sub }}>{timeShort(msg.at)}</span>
          {isOut && <TickIcon status={msg.status} />}
        </div>
      </div>
    </div>
  );
}

// ── Chat thread ───────────────────────────────────────────────────────────
function ChatThread({ contact, onSend }) {
  const [reply, setReply] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [contact.messages]);

  const handleSend = () => {
    if (!reply.trim()) return;
    onSend(contact.id, reply.trim());
    setReply('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // Group messages by date
  const grouped = [];
  let lastDate = null;
  contact.messages.forEach((m) => {
    const dl = dateLabel(m.at);
    if (dl !== lastDate) { grouped.push({ type: 'date', label: dl }); lastDate = dl; }
    grouped.push({ type: 'msg', msg: m });
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: WA.bg }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px',
        backgroundColor: WA.header, borderBottom: `1px solid ${WA.border}`,
      }}>
        <Avatar initials={contact.avatar} size={42} online={contact.online} />
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 600, fontSize: 15, color: WA.text }}>{contact.name}</p>
          <p style={{ fontSize: 12, color: WA.sub }}>
            {contact.online ? 'online' : contact.phone}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <Phone size={20} style={{ color: WA.sub, cursor: 'pointer' }} />
          <MoreVertical size={20} style={{ color: WA.sub, cursor: 'pointer' }} />
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 10%' }}>
        {grouped.map((item, i) =>
          item.type === 'date' ? (
            <div key={`d-${i}`} style={{ textAlign: 'center', margin: '12px 0' }}>
              <span style={{
                fontSize: 11, fontWeight: 600, color: WA.sub,
                backgroundColor: '#E1F2FB', borderRadius: 8, padding: '3px 10px',
              }}>
                {item.label}
              </span>
            </div>
          ) : (
            <Bubble key={item.msg.id} msg={item.msg} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply box */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 16px',
        backgroundColor: WA.header, borderTop: `1px solid ${WA.border}`,
      }}>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type a message"
          rows={1}
          style={{
            flex: 1, resize: 'none', border: 'none', outline: 'none',
            borderRadius: 24, padding: '10px 16px',
            fontSize: 14, color: WA.text, backgroundColor: '#fff',
            maxHeight: 120, overflowY: 'auto',
            boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={handleSend}
          disabled={!reply.trim()}
          style={{
            width: 44, height: 44, borderRadius: '50%', border: 'none', cursor: reply.trim() ? 'pointer' : 'default',
            backgroundColor: reply.trim() ? WA.green : WA.sub,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, transition: 'background 0.2s',
          }}
        >
          <Send size={18} style={{ color: '#fff' }} />
        </button>
      </div>
    </div>
  );
}

// ── Empty thread ──────────────────────────────────────────────────────────
function EmptyThread() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backgroundColor: WA.bg, gap: 12,
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        backgroundColor: WA.greenLight, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <MessageCircle size={36} style={{ color: WA.green }} />
      </div>
      <p style={{ fontWeight: 700, fontSize: 18, color: WA.text }}>ABHI CABS WhatsApp</p>
      <p style={{ fontSize: 13, color: WA.sub, textAlign: 'center', maxWidth: 300 }}>
        Select a conversation to view messages, or send automated notifications from the Dispatch board.
      </p>
    </div>
  );
}

// ── Automation panel (bottom-left below contact list) ─────────────────────
function AutomationPanel({ notifEvents }) {
  const [open, setOpen] = useState(false);
  const isConfigured = false;

  return (
    <div style={{ borderTop: `1px solid ${WA.border}`, backgroundColor: '#fff' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer',
          color: WA.text,
        }}
      >
        <Zap size={15} style={{ color: '#F59E0B' }} />
        <span style={{ fontSize: 13, fontWeight: 700, flex: 1, textAlign: 'left' }}>Automation</span>
        <span style={{
          fontSize: 10, fontWeight: 700, backgroundColor: isConfigured ? WA.green : '#F59E0B',
          color: '#fff', borderRadius: 4, padding: '1px 6px',
        }}>
          {isConfigured ? 'LIVE' : 'MOCK'}
        </span>
        <ChevronDown size={14} style={{ color: WA.sub, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {open && (
        <div style={{ padding: '0 16px 12px', borderTop: `1px solid ${WA.border}` }}>
          {/* Templates */}
          <p style={{ fontSize: 11, fontWeight: 700, color: WA.sub, margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Auto-fire templates
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {TEMPLATES.map((t) => (
              <div key={t.key} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 8, backgroundColor: WA.panelBg,
              }}>
                <CheckCircle size={12} style={{ color: WA.green, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: WA.text }}>{t.label}</p>
                  <p style={{ fontSize: 10, color: WA.sub }}>{t.trigger}</p>
                </div>
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                  backgroundColor: t.channel === 'whatsapp' ? '#f0fdf4' : '#eff6ff',
                  color: t.channel === 'whatsapp' ? WA.greenDark : '#2563EB',
                }}>
                  {t.channel.toUpperCase()}
                </span>
              </div>
            ))}
          </div>

          {/* Recent events */}
          {notifEvents.length > 0 && (
            <>
              <p style={{ fontSize: 11, fontWeight: 700, color: WA.sub, margin: '10px 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recent triggers
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {notifEvents.slice(0, 4).map((e) => (
                  <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: WA.sub }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: WA.green, flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.bookingNumber || e.bookingId || e.kind}
                    </span>
                    <span style={{ fontSize: 10, flexShrink: 0 }}>{timeShort(e.at)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          <div style={{ marginTop: 10 }}>
            <Alert type="info">
              Set MSG91_AUTH_KEY in backend .env to go live.
            </Alert>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────
export default function WhatsApp() {
  const { feed } = useAdminRealtimeContext();
  const toast = useToast();

  const [contacts,  setContacts]  = useState(INIT_CONTACTS);
  const [selected,  setSelected]  = useState(null);
  const [search,    setSearch]    = useState('');

  const notifEvents = feed
    .filter((f) => ['booking:created', 'booking:allocated', 'trip:status'].includes(f.kind))
    .slice(0, 10);

  // Push new booking events as outbound automated messages
  useEffect(() => {
    if (notifEvents.length === 0) return;
    const latest = notifEvents[0];
    if (!latest?.bookingNumber) return;
    setContacts((prev) => {
      const existing = prev.find((c) => c.id === `event-${latest.id}`);
      if (existing) return prev;
      const newContact = {
        id: `event-${latest.id}`,
        name: latest.customerName || 'Customer',
        phone: latest.phone || '+91 XXXXXXXXXX',
        avatar: (latest.customerName || 'C')[0].toUpperCase(),
        lastMsg: `Automated: ${latest.kind}`,
        lastAt: latest.at,
        unread: 0, online: false,
        messages: [{
          id: `em-${latest.id}`,
          from: 'out',
          text: `Automated notification fired for booking ${latest.bookingNumber}`,
          at: latest.at,
          status: 'delivered',
          template: latest.kind === 'booking:created' ? 'booking_confirmed' : 'driver_assigned',
        }],
      };
      return [newContact, ...prev];
    });
  }, [notifEvents.length]);

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const selectedContact = contacts.find((c) => c.id === selected);

  const handleSelect = (id) => {
    setSelected(id);
    setContacts((prev) =>
      prev.map((c) => c.id === id ? { ...c, unread: 0 } : c)
    );
  };

  const handleSend = (contactId, text) => {
    const newMsg = {
      id: `msg-${Date.now()}`,
      from: 'out',
      text,
      at: new Date().toISOString(),
      status: 'sent',
    };
    setContacts((prev) =>
      prev.map((c) =>
        c.id === contactId
          ? { ...c, messages: [...c.messages, newMsg], lastMsg: text, lastAt: newMsg.at }
          : c
      )
    );
    // Simulate read receipt after 2s
    setTimeout(() => {
      setContacts((prev) =>
        prev.map((c) =>
          c.id === contactId
            ? { ...c, messages: c.messages.map((m) => m.id === newMsg.id ? { ...m, status: 'read' } : m) }
            : c
        )
      );
    }, 2000);
    toast.success('Message sent');
  };

  const totalUnread = contacts.reduce((s, c) => s + c.unread, 0);

  return (
    <div style={{ height: 'calc(100vh - 88px)', display: 'flex', borderRadius: 12, overflow: 'hidden', border: `1px solid ${WA.border}`, boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>

      {/* ── LEFT: Contact list ── */}
      <div style={{ width: 340, minWidth: 280, display: 'flex', flexDirection: 'column', backgroundColor: '#fff', borderRight: `1px solid ${WA.border}` }}>

        {/* Header */}
        <div style={{ padding: '14px 16px 10px', backgroundColor: WA.header, borderBottom: `1px solid ${WA.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Avatar initials="AC" size={38} />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, color: WA.text }}>ABHI CABS</p>
                <p style={{ fontSize: 11, color: WA.sub }}>WhatsApp Business</p>
              </div>
            </div>
            {totalUnread > 0 && (
              <span style={{
                backgroundColor: WA.green, color: '#fff', borderRadius: 12,
                fontSize: 11, fontWeight: 700, padding: '2px 8px',
              }}>
                {totalUnread} new
              </span>
            )}
          </div>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: WA.sub }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or start new chat"
              style={{
                width: '100%', padding: '7px 12px 7px 32px',
                border: 'none', borderRadius: 8, backgroundColor: '#fff',
                fontSize: 13, color: WA.text, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* Contact list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredContacts.length === 0 ? (
            <p style={{ textAlign: 'center', padding: 32, fontSize: 13, color: WA.sub }}>No conversations found</p>
          ) : (
            filteredContacts.map((c) => (
              <ContactRow key={c.id} contact={c} selected={selected === c.id} onClick={() => handleSelect(c.id)} />
            ))
          )}
        </div>

        {/* Automation panel */}
        <AutomationPanel notifEvents={notifEvents} />
      </div>

      {/* ── RIGHT: Chat thread ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {selectedContact
          ? <ChatThread contact={selectedContact} onSend={handleSend} />
          : <EmptyThread />
        }
      </div>
    </div>
  );
}
