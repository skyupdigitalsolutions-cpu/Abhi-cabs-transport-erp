import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ToggleRight, Globe } from 'lucide-react';
import Button from '../../components/ui/Button';
import IconButton from '../../components/ui/IconButton';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Alert from '../../components/ui/Alert';
import LoadingState from '../../components/ui/LoadingState';
import { useToast } from '../../hooks/useToast';
import { serviceStateService } from '../../services/serviceStateService';

/**
 * Service States — the allowlist of states a pickup may START in.
 *
 * Backend: /admin/service-states (SETTINGS_MANAGE). A change is live on the
 * next quote. A state only lets a pickup through; customers can get a fare
 * there only once it also has an active city with rate cards and rental
 * packages (Rate Cards tab).
 */

const EMPTY = { name: '', code: '', aliases: '', note: '' };

function StateForm({ open, onClose, initial, onSubmit }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(initial ? {
      name: initial.name || '',
      code: initial.code || '',
      aliases: Array.isArray(initial.aliases) ? initial.aliases.join(', ') : '',
      note: initial.note || '',
    } : EMPTY);
  }, [open, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (form.name.trim().length < 2) { setError('Enter the state name, e.g. Tamil Nadu'); return; }
    setSaving(true); setError('');
    try {
      await onSubmit({
        name: form.name.trim(),
        code: form.code.trim() || (initial ? null : undefined),
        aliases: form.aliases.split(',').map((a) => a.trim()).filter(Boolean),
        note: form.note.trim() || (initial ? null : undefined),
      });
    } catch (e) {
      setError(e.message || 'Could not save');
    } finally { setSaving(false); }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? `Edit ${initial.name}` : 'Open a state'}
      footer={<>
        <Button variant="secondary" onClick={onClose}>Cancel</Button>
        <Button onClick={submit} loading={saving}>{initial ? 'Save' : 'Open state'}</Button>
      </>}
    >
      <div className="space-y-3">
        {error && <Alert type="error">{error}</Alert>}
        <FormField label="State name" required hint="Exactly as customers should see it.">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Tamil Nadu" autoFocus />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Code" hint="Two letters, for reference.">
            <Input value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="TN" maxLength={8} />
          </FormField>
          <FormField label="Other spellings" hint="Comma separated. Maps often return variants.">
            <Input value={form.aliases} onChange={(e) => set('aliases', e.target.value)} placeholder="tn, tamilnadu" />
          </FormField>
        </div>
        <FormField label="Note" hint="Why it opened, which permit, who approved it.">
          <Textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} maxLength={500} />
        </FormField>
      </div>
    </Modal>
  );
}

export default function ServiceStatesTab() {
  const toast = useToast();
  const [states, setStates] = useState([]);
  const [status, setStatus] = useState('loading');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try { setStates(await serviceStateService.list()); setStatus('success'); }
    catch (e) {
      toast.error(e.status === 403 ? 'Service states need the SETTINGS_MANAGE permission.' : (e.message || 'Failed to load states'));
      setStatus('error');
    }
  }, [toast]);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (body) => {
    const { state, backfilled = [] } = await serviceStateService.create(body);
    toast.success(
      backfilled.length
        ? `${state.name} opened. ${backfilled.join(', ')} were already in service and are now listed explicitly.`
        : `${state.name} opened — new quotes accept it immediately`,
    );
    setFormOpen(false); load();
  };

  const handleUpdate = async (body) => {
    await serviceStateService.update(editing.id, body);
    toast.success('State updated');
    setFormOpen(false); setEditing(null); load();
  };

  const handleDeactivate = async (st) => {
    if (!confirm(`Close ${st.name}? New pickups there become booking requests. Existing bookings are not affected.`)) return;
    try { await serviceStateService.deactivate(st.id); toast.success(`${st.name} closed`); load(); }
    catch (e) {
      toast.error(e.code === 'LAST_ACTIVE_STATE' ? 'At least one state must stay open.' : (e.message || 'Could not close state'));
    }
  };

  const handleReactivate = async (st) => {
    try { await serviceStateService.update(st.id, { isActive: true }); toast.success(`${st.name} reopened`); load(); }
    catch (e) { toast.error(e.message || 'Could not reopen state'); }
  };

  const handleSeed = async () => {
    try { const r = await serviceStateService.seedDefaults(); toast.success(`${r.created?.length || 0} added, ${r.skipped || 0} already present`); load(); }
    catch (e) { toast.error(e.message || 'Could not seed defaults'); }
  };

  if (status === 'loading') return <LoadingState label="Loading service states…" />;

  const open = states.filter((s) => s.isActive).length;

  return (
    <div className="space-y-4">
      <Alert type="info">
        A state listed here lets customers start a pickup in it. To actually quote and book there, the state also needs
        a city with rate cards and rental packages (Rate Cards tab → Add new city → copy pricing from an existing city).
        Drops can be anywhere in India from an open state.
      </Alert>

      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>
          <Globe size={12} className="inline -mt-0.5 mr-1" />States ({open} open)
        </p>
        <div className="flex gap-2">
          {states.length === 0 && <Button size="sm" variant="secondary" onClick={handleSeed}>Record default states</Button>}
          <Button size="sm" icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>Open state</Button>
        </div>
      </div>

      {states.length === 0 ? (
        <div style={{ padding: '36px 16px', textAlign: 'center', borderRadius: 14, border: '1.5px dashed #E8E8E4', backgroundColor: '#FAFAFA' }}>
          <p style={{ fontWeight: 700, fontSize: 13.5, color: '#6B7280' }}>No states recorded yet</p>
          <p style={{ fontSize: 12, color: '#9A9A9A', marginTop: 4 }}>
            Karnataka, Telangana, Andhra Pradesh and Maharashtra are in service by default. Opening a new state records them automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {states.map((st) => (
            <div key={st.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12, border: '1.5px solid #E8E8E4', backgroundColor: '#fff', opacity: st.isActive ? 1 : 0.5 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 13.5, color: '#111' }}>
                  {st.name}{st.code ? ` (${st.code})` : ''}
                  {!st.isActive && <Badge tone="slate" className="ml-2">Closed</Badge>}
                </p>
                {(st.note || (st.aliases || []).length > 0) && (
                  <p style={{ fontSize: 11.5, color: '#6B7280', marginTop: 1 }}>
                    {(st.aliases || []).length > 0 && <>Also matches: {st.aliases.join(', ')}</>}
                    {st.note && <span style={{ color: '#9A9A9A' }}>{(st.aliases || []).length > 0 ? ' — ' : ''}{st.note}</span>}
                  </p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <IconButton icon={Pencil} size="sm" label="Edit" onClick={() => { setEditing(st); setFormOpen(true); }} />
                {st.isActive
                  ? <IconButton icon={Trash2} size="sm" label="Close state" variant="danger" onClick={() => handleDeactivate(st)} />
                  : <IconButton icon={ToggleRight} size="sm" label="Reopen" onClick={() => handleReactivate(st)} />}
              </div>
            </div>
          ))}
        </div>
      )}

      <StateForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        onSubmit={editing ? handleUpdate : handleCreate}
      />
    </div>
  );
}
