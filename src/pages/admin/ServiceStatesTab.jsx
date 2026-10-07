import { useState, useEffect, useCallback } from 'react';
import { Plus, Globe, ToggleRight, ToggleLeft } from 'lucide-react';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Alert from '../../components/ui/Alert';
import SearchInput from '../../components/ui/SearchInput';
import LoadingState from '../../components/ui/LoadingState';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { PERMISSIONS } from '../../constants';
import { serviceStateService } from '../../services/serviceStateService';

// The four states in service by default (held implicitly until the table is
// first written to — see serviceStateService for the full story).
const BUILT_IN = ['Andhra Pradesh', 'Karnataka', 'Maharashtra', 'Telangana'];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand',
  'Karnataka', 'Kerala', 'Ladakh', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Puducherry', 'Punjab', 'Rajasthan',
  'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
].sort();

export default function ServiceStatesTab() {
  const toast = useToast();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(PERMISSIONS.SETTINGS_MANAGE);

  const [states, setStates] = useState([]);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try { setStates(await serviceStateService.list()); setStatus('success'); }
    catch (e) { toast.error(e.message || 'Failed to load service states'); setStatus('error'); }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const handleToggle = async (st) => {
    setBusyId(st.id);
    try {
      await serviceStateService.setActive(st.id, !st.isActive);
      toast.success(st.isActive ? `${st.name} disabled — new pickups there will be refused` : `${st.name} enabled — new quotes accept it immediately`);
      load();
    } catch (e) {
      toast.error(
        e.status === 403 ? 'Only an admin can change service states.'
          : e.code === 'LAST_ACTIVE_STATE' ? 'Can’t disable the last active state — every booking would be refused.'
          : (e.message || 'Could not update the state'),
      );
    } finally { setBusyId(null); }
  };

  const q = search.trim().toLowerCase();
  const filtered = states.filter((s) => !q || s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q));
  const tableEmpty = status === 'success' && states.length === 0;

  if (status === 'loading') return <LoadingState label="Loading service states…" />;

  return (
    <div className="space-y-4">
      <div style={{ borderRadius: 14, border: '1.5px solid #E8E8E4', background: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#EFF6FF', display: 'grid', placeItems: 'center' }}><Globe size={17} color="#1D4ED8" /></div>
        <div style={{ flex: 1, minWidth: 220 }}>
          <p style={{ fontWeight: 800, fontSize: 14, color: '#111' }}>Service states</p>
          <p style={{ fontSize: 12, color: '#6B7280' }}>Which states a trip can be booked in. A pickup in a state that isn’t enabled is refused and becomes a booking request.</p>
        </div>
        {canManage && <Button size="sm" icon={Plus} onClick={() => setFormOpen(true)}>Add State</Button>}
      </div>

      {/* Fresh-backend case: table empty but the built-in four are live implicitly. */}
      {tableEmpty && (
        <Alert type="info">
          <strong>The four default states are currently in service: {BUILT_IN.join(', ')}.</strong> They’re held
          implicitly until you add your first state — do that below and they’ll be recorded automatically, so
          adding a state never switches the originals off.
        </Alert>
      )}

      {!tableEmpty && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>Enabled states ({states.filter((s) => s.isActive).length})</p>
            <SearchInput value={search} onChange={setSearch} placeholder="Search states…" style={{ maxWidth: 220 }} />
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', borderRadius: 14, border: '1.5px dashed #E8E8E4', background: '#FAFAFA', color: '#6B7280', fontSize: 13 }}>
              {search ? 'No states match.' : 'No states recorded yet.'}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((st) => (
                <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E8E8E4', background: '#fff', opacity: st.isActive ? 1 : 0.55 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 13.5, color: '#111' }}>
                      {st.name}{st.code ? <span style={{ color: '#9A9A9A', fontWeight: 600 }}> · {st.code}</span> : null}
                      {!st.isActive && <Badge tone="slate" className="ml-2">Disabled</Badge>}
                    </p>
                    {st.note && <p style={{ fontSize: 11.5, color: '#9A9A9A', marginTop: 1 }}>{st.note}</p>}
                  </div>
                  {canManage && (
                    <IconButton
                      icon={st.isActive ? ToggleRight : ToggleLeft}
                      size="sm"
                      label={st.isActive ? 'Disable' : 'Enable'}
                      variant={st.isActive ? 'default' : 'default'}
                      disabled={busyId === st.id}
                      onClick={() => handleToggle(st)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <AddStateModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        existing={states}
        onDone={(res) => {
          setFormOpen(false);
          toast.success(`${res.state?.name || 'State'} enabled`);
          if (Array.isArray(res.backfilled) && res.backfilled.length) {
            toast.success(`${res.backfilled.join(', ')} were already in service and are now recorded too.`, { duration: 9000 });
          }
          load();
        }}
      />
    </div>
  );
}

function AddStateModal({ open, onClose, existing, onDone }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => { if (open) { setName(''); setCode(''); setNote(''); setError(null); } }, [open]);

  // Offer only states not already recorded.
  const taken = new Set((existing || []).map((s) => s.name.trim().toLowerCase()));
  const options = INDIAN_STATES.filter((s) => !taken.has(s.toLowerCase())).map((s) => ({ value: s, label: s }));

  const submit = async () => {
    if (!name.trim()) { setError('Pick a state'); return; }
    setLoading(true); setError(null);
    try {
      const res = await serviceStateService.create({ name, code: code.trim() || undefined, note: note.trim() || undefined });
      onDone(res);
    } catch (e) {
      setError(e.status === 403 ? 'Only an admin can add service states.' : (e.message || 'Could not add the state'));
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Add service state" maxWidth={460}>
      <div className="space-y-4">
        <p style={{ fontSize: 12.5, color: '#6B7280' }}>
          Enabling a state lets trips be booked for pickups there. New quotes accept it immediately.
        </p>
        <FormField label="State" required error={error}>
          <Select value={name} onChange={(e) => { setName(e.target.value); setError(null); }}
            options={options} placeholder="Select a state…" searchable />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Code" hint="2-letter, optional">
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="KA" maxLength={2} />
          </FormField>
          <div style={{ gridColumn: 'span 2' }}>
            <FormField label="Note" hint="Internal, optional">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. launched Oct 2026" />
            </FormField>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={submit}>Add State</Button>
        </div>
      </div>
    </Modal>
  );
}
