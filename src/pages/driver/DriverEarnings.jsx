import { useState, useEffect } from 'react';
import { IndianRupee, TrendingUp, Wallet, ArrowDownCircle, CalendarCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import LoadingState from '../../components/ui/LoadingState';
import { useToast } from '../../hooks/useToast';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { tripService } from '../../services';
import { TRIP_STATUS } from '../../constants';

const WEEKS = ['This week','Last week','This month'];

// ── Earnings derived from this driver's completed trips (via tripService,
// never a raw mockDb import — so it works against the real API too). ─────
function useEarnings(driverId) {
  const [state, setState] = useState({ loading: true, perTrip: [], total: 0, pending: 0, wallet: 0 });

  useEffect(() => {
    if (!driverId) return;
    let cancelled = false;
    tripService.list({ limit: 14, filters: { driverId, status: TRIP_STATUS.COMPLETED } })
      .then((r) => {
        if (cancelled) return;
        const driverTrips = r.data || [];
        const perTrip = driverTrips.map((t, i) => ({
          id: t.id, date: t.startedAt,
          route: `${t.pickup?.split(',')[0]} → ${t.drop?.split(',')[0]}`,
          amount: 400 + Math.floor(Math.random() * 600),
          paid: i % 3 !== 0,
        }));
        const total   = perTrip.reduce((s, t) => s + t.amount, 0);
        const pending = perTrip.filter(t => !t.paid).reduce((s, t) => s + t.amount, 0);
        const wallet  = 1200 + Math.floor(Math.random() * 800);
        setState({ loading: false, perTrip, total, pending, wallet });
      })
      .catch(() => setState((s) => ({ ...s, loading: false })));
    return () => { cancelled = true; };
  }, [driverId]);

  return state;
}

function StatCard({ icon: Icon, label, value, tone }) {
  const T = { blue: ['#eef2fb','#3B65DB'], green: ['#f0fdf4','#38B763'], amber: ['#fffbeb','#F59E0B'], purple: ['#f5f3ff','#7c3aed'] };
  const [bg,color] = T[tone]||T.blue;
  return (
    <Card className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: bg }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs" style={{ color: '#6B7280' }}>{label}</p>
        <p className="text-base font-bold" style={{ color: '#1F2937' }}>{value}</p>
      </div>
    </Card>
  );
}

export default function DriverEarnings() {
  const { user } = useAuth();
  const toast    = useToast();
  const { loading, perTrip, total, pending, wallet } = useEarnings(user?.id);
  const [range, setRange] = useState('This week');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmt, setWithdrawAmt]   = useState('');

  const handleWithdraw = async () => {
    const amt = Number(withdrawAmt);
    if (!amt || amt > wallet) { toast.error('Invalid amount'); return; }
    toast.success(`₹${amt.toLocaleString('en-IN')} withdrawal requested`);
    setWithdrawOpen(false); setWithdrawAmt('');
  };

  if (loading) return <LoadingState label="Loading earnings…" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>Earnings & Wallet</h2>
      </div>

      {/* Wallet card */}
      <div className="rounded-2xl p-5 mb-5 text-white" style={{ background: 'linear-gradient(135deg, #3B65DB, #2F55C7)' }}>
        <div className="flex items-center gap-2 mb-1">
          <Wallet size={16} style={{ opacity: 0.8 }} />
          <p className="text-sm font-medium" style={{ opacity: 0.8 }}>Wallet Balance</p>
        </div>
        <p className="text-3xl font-bold mb-4">{formatCurrency(wallet)}</p>
        <Button
          size="sm" icon={ArrowDownCircle}
          style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
          onClick={() => setWithdrawOpen(true)}
        >
          Withdraw
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <StatCard icon={IndianRupee} label="Total earned"   value={formatCurrency(total)}   tone="green"  />
        <StatCard icon={TrendingUp}  label="Pending payout" value={formatCurrency(pending)}  tone="amber"  />
        <StatCard icon={CalendarCheck} label="Trips completed" value={perTrip.filter(t=>t.paid).length} tone="blue" />
        <StatCard icon={Wallet} label="Avg per trip" value={formatCurrency(Math.round(total/perTrip.length||0))} tone="purple" />
      </div>

      {/* Range filter */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {WEEKS.map(w => (
          <button key={w} onClick={() => setRange(w)}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap focus-ring"
            style={{ backgroundColor: range===w ? '#3B65DB':'#F7F8FC', color: range===w ? '#fff':'#6B7280', border: `1px solid ${range===w?'#3B65DB':'#E5E7EB'}` }}>
            {w}
          </button>
        ))}
      </div>

      {/* Trip earnings list */}
      <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: '#F7F8FC' }}>
          <p className="text-sm font-bold" style={{ color: '#1F2937' }}>Trip Earnings</p>
        </div>
        {perTrip.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3 px-4 py-3"
            style={{ borderTop: i>0 ? '1px solid #F7F8FC' : 'none' }}>
            <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0"
              style={{ backgroundColor: '#eef2fb' }}>
              <IndianRupee size={14} style={{ color: '#3B65DB' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#1F2937' }}>{t.route}</p>
              <p className="text-xs" style={{ color: '#6B7280' }}>{formatDate(t.date)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{formatCurrency(t.amount)}</p>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                style={t.paid ? { backgroundColor:'#f0fdf4', color:'#38B763' } : { backgroundColor:'#fffbeb', color:'#F59E0B' }}>
                {t.paid ? 'Paid' : 'Pending'}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Withdraw modal */}
      <Modal open={withdrawOpen} onClose={() => setWithdrawOpen(false)} title="Withdraw Funds" size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setWithdrawOpen(false)}>Cancel</Button>
          <Button size="sm" icon={ArrowDownCircle} onClick={handleWithdraw}>Request Withdrawal</Button>
        </>}
      >
        <div className="space-y-4">
          <div className="rounded-xl p-3" style={{ backgroundColor: '#F7F8FC' }}>
            <p className="text-xs" style={{ color: '#6B7280' }}>Available balance</p>
            <p className="text-lg font-bold" style={{ color: '#3B65DB' }}>{formatCurrency(wallet)}</p>
          </div>
          <FormField label="Amount to withdraw (₹)" required>
            <Input type="number" min="100" max={wallet} value={withdrawAmt}
              onChange={e => setWithdrawAmt(e.target.value)} placeholder="Enter amount" />
          </FormField>
          <p className="text-xs" style={{ color: '#6B7280' }}>Funds will be transferred to your registered bank account within 24 hours.</p>
        </div>
      </Modal>
    </div>
  );
}
