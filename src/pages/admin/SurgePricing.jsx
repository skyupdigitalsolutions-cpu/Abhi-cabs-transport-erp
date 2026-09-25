/**
 * src/pages/admin/SurgePricing.jsx
 *
 * Surge pricing admin — uses existing backend routes only:
 *   GET    /admin/surge/rules
 *   PATCH  /admin/surge/rules/:tier
 *   GET    /admin/surge/areas
 *   POST   /admin/surge/areas
 *   PATCH  /admin/surge/areas/:id
 *   DELETE /admin/surge/areas/:id
 *   GET    /admin/surge/areas/classify?lat=&lng=
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Pencil, Trash2, ToggleRight, MapPin, Zap, Clock, Search, Save,
} from 'lucide-react';
import PageHeader   from '../../components/ui/PageHeader';
import Button       from '../../components/ui/Button';
import IconButton   from '../../components/ui/IconButton';
import Badge        from '../../components/ui/Badge';
import Modal        from '../../components/ui/Modal';
import FormField    from '../../components/ui/FormField';
import Input        from '../../components/ui/Input';
import Select       from '../../components/ui/Select';
import Textarea     from '../../components/ui/Textarea';
import Alert        from '../../components/ui/Alert';
import LoadingState from '../../components/ui/LoadingState';
import SearchInput  from '../../components/ui/SearchInput';
import { useToast } from '../../hooks/useToast';
import { surgeService } from '../../services/surgeService';

const TIERS = ['METRO', 'TALUKA', 'VILLAGE'];

const TIER_META = {
  METRO:   { icon: '🏙️', label: 'Metro', desc: 'City / urban — drivers nearby', bg: '#EFF6FF', color: '#1D4ED8', tone: 'blue' },
  TALUKA:  { icon: '🏘️', label: 'Taluka', desc: 'Town / semi-urban — moderate supply', bg: '#FFF7ED', color: '#C2410C', tone: 'amber' },
  VILLAGE: { icon: '🌾', label: 'Village', desc: 'Rural — limited driver supply', bg: '#F0FDF4', color: '#15803D', tone: 'green' },
};

const TIER_OPTIONS = TIERS.map((t) => ({ value: t, label: `${TIER_META[t].icon} ${TIER_META[t].label} — ${TIER_META[t].desc}` }));

// ── Surge Fee Setup (PATCH /rules/:tier only — rules must be seeded) ──────

function SurgeFeeSetup({ rules, onSave }) {
  const ruleMap = {};
  rules.forEach((r) => { ruleMap[r.tier] = r; });

  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(null);
  const [dirty, setDirty] = useState({});

  // Rebuild form when rules change (initial load / after save)
  useEffect(() => {
    const f = {};
    rules.forEach((r) => {
      f[r.tier] = {
        immediatePct: String(r.immediatePct),
        standardPct: String(r.standardPct),
        immediateWithinMinutes: String(r.immediateWithinMinutes),
      };
    });
    setForm(f);
    setDirty({});
  }, [rules]);

  const set = (tier, key, val) => {
    setForm((f) => ({ ...f, [tier]: { ...f[tier], [key]: val } }));
    setDirty((d) => ({ ...d, [tier]: true }));
  };

  const save = async (tier) => {
    setSaving(tier);
    try {
      await onSave(tier, {
        immediatePct: Number(form[tier].immediatePct) || 0,
        standardPct: Number(form[tier].standardPct) || 0,
        immediateWithinMinutes: Number(form[tier].immediateWithinMinutes) || 60,
      });
      setDirty((d) => ({ ...d, [tier]: false }));
    } finally { setSaving(null); }
  };

  if (rules.length === 0) {
    return (
      <Alert type="info">
        No surge rules found. Seed the database with METRO, TALUKA, and VILLAGE rules to configure surge fees here.
      </Alert>
    );
  }

  return (
    <div style={{
      borderRadius: 16, border: '1.5px solid #E8E8E4', backgroundColor: '#fff',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px', borderBottom: '1.5px solid #F0F0EC',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'linear-gradient(135deg, #FFFBEA 0%, #FFF8E1 100%)',
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: '#FFC107', display: 'grid', placeItems: 'center',
          boxShadow: '0 4px 12px rgba(255,193,7,0.3)',
        }}>
          <Zap size={18} color="#111" />
        </div>
        <div>
          <p style={{ fontWeight: 800, fontSize: 16, color: '#111' }}>Surge Fee Setup</p>
          <p style={{ fontSize: 12.5, color: '#92400E', fontWeight: 500 }}>
            Set the surge percentage for each area tier. Changes apply to new quotes only.
          </p>
        </div>
      </div>

      {/* Tier rows — only tiers that have rules */}
      <div>
        {rules.map((rule, i) => {
          const tier = rule.tier;
          const m = TIER_META[tier] || TIER_META.METRO;
          const f = form[tier];
          if (!f) return null;

          return (
            <div
              key={tier}
              style={{
                padding: '16px 20px',
                borderBottom: i < rules.length - 1 ? '1px solid #F0F0EC' : 'none',
                display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap',
              }}
            >
              {/* Tier info */}
              <div style={{ minWidth: 160, flex: '0 0 auto' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 22 }}>{m.icon}</span>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 14, color: m.color }}>{m.label}</p>
                    <p style={{ fontSize: 11.5, color: '#6B7280', fontWeight: 500 }}>{m.desc}</p>
                  </div>
                </div>
              </div>

              {/* Fields */}
              <div style={{ display: 'flex', gap: 10, flex: 1, alignItems: 'flex-end', flexWrap: 'wrap', minWidth: 300 }}>
                <div style={{ flex: 1, minWidth: 90 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                    <Clock size={10} className="inline -mt-0.5 mr-0.5" /> Immediate %
                  </label>
                  <Input type="number" min="0" max="100" value={f.immediatePct}
                    onChange={(e) => set(tier, 'immediatePct', e.target.value)}
                    style={{ textAlign: 'center' }} />
                </div>
                <div style={{ flex: 1, minWidth: 90 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                    <Zap size={10} className="inline -mt-0.5 mr-0.5" /> Scheduled %
                  </label>
                  <Input type="number" min="0" max="100" value={f.standardPct}
                    onChange={(e) => set(tier, 'standardPct', e.target.value)}
                    style={{ textAlign: 'center' }} />
                </div>
                <div style={{ flex: 1, minWidth: 110 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6B7280', display: 'block', marginBottom: 4 }}>
                    Window (min)
                  </label>
                  <Input type="number" min="1" max="1440" value={f.immediateWithinMinutes}
                    onChange={(e) => set(tier, 'immediateWithinMinutes', e.target.value)}
                    style={{ textAlign: 'center' }} />
                </div>
                <Button
                  size="sm" icon={Save}
                  onClick={() => save(tier)}
                  loading={saving === tier}
                  disabled={!dirty[tier]}
                  style={!dirty[tier] ? {} : { backgroundColor: '#22A65A', boxShadow: '0 3px 8px rgba(34,166,90,0.25)' }}
                >
                  Save
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Explainer */}
      <div style={{
        padding: '12px 20px', backgroundColor: '#FAFAFA',
        borderTop: '1px solid #F0F0EC', fontSize: 12, color: '#6B7280',
      }}>
        <strong>Immediate %</strong> is added when the booking is within the window of pickup.
        <strong> Scheduled %</strong> is added to all bookings regardless of timing.
        The higher of the two applies.
      </div>
    </div>
  );
}

// ── Area Form Modal ────────────────────────────────────────────────────────

function AreaFormModal({ open, onClose, initial, onSubmit }) {
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: '', tier: 'METRO', centreLat: '', centreLng: '', radiusKm: '15', note: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initial) {
      setForm({
        name: initial.name || '', tier: initial.tier || 'METRO',
        centreLat: String(initial.centreLat ?? ''), centreLng: String(initial.centreLng ?? ''),
        radiusKm: String(initial.radiusKm ?? 15), note: initial.note || '',
      });
    } else if (open) {
      setForm({ name: '', tier: 'METRO', centreLat: '', centreLng: '', radiusKm: '15', note: '' });
    }
    setErrors({});
  }, [open, initial]);

  const set = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => ({ ...e, [k]: undefined })); };

  const submit = async () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Name is required';
    if (form.centreLat === '' || isNaN(Number(form.centreLat))) errs.centreLat = 'Required';
    if (form.centreLng === '' || isNaN(Number(form.centreLng))) errs.centreLng = 'Required';
    if (!form.radiusKm || Number(form.radiusKm) < 1) errs.radiusKm = 'Min 1 km';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setLoading(true);
    try {
      await onSubmit({
        name: form.name.trim(), tier: form.tier,
        centreLat: Number(form.centreLat), centreLng: Number(form.centreLng),
        radiusKm: Number(form.radiusKm),
        ...(form.note.trim() && { note: form.note.trim() }),
      });
      onClose();
    } catch (err) { setErrors({ name: err.message || 'Failed to save' }); }
    finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? 'Edit Area' : 'Add Surge Area'} maxWidth={480}>
      <div className="space-y-4">
        <FormField label="Area name" required error={errors.name}>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)}
            placeholder="e.g. Ramanagara" disabled={isEdit} />
        </FormField>
        <FormField label="Tier" required>
          <Select value={form.tier} onChange={(e) => set('tier', e.target.value)} options={TIER_OPTIONS} />
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label="Latitude" required error={errors.centreLat}>
            <Input type="number" step="any" value={form.centreLat}
              onChange={(e) => set('centreLat', e.target.value)} placeholder="12.9716" />
          </FormField>
          <FormField label="Longitude" required error={errors.centreLng}>
            <Input type="number" step="any" value={form.centreLng}
              onChange={(e) => set('centreLng', e.target.value)} placeholder="77.5946" />
          </FormField>
          <FormField label="Radius (km)" required error={errors.radiusKm}>
            <Input type="number" min="1" max="200" value={form.radiusKm}
              onChange={(e) => set('radiusKm', e.target.value)} placeholder="15" />
          </FormField>
        </div>
        <FormField label="Note" hint="Internal — why this area, who requested it.">
          <Textarea value={form.note} onChange={(e) => set('note', e.target.value)} rows={2} />
        </FormField>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={submit}>{isEdit ? 'Save Changes' : 'Add Area'}</Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Classify Tester ────────────────────────────────────────────────────────

function ClassifyTester() {
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const test = async () => {
    if (!lat || !lng) return;
    setLoading(true);
    try { setResult(await surgeService.classify(Number(lat), Number(lng))); }
    catch (e) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const m = result ? (TIER_META[result.tier] || TIER_META.METRO) : null;

  return (
    <div style={{ borderRadius: 14, border: '1.5px solid #E8E8E4', padding: 16, backgroundColor: '#FAFAFA' }}>
      <p style={{ fontSize: 12, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>
        <Search size={12} className="inline -mt-0.5 mr-1" /> Test a Coordinate
      </p>
      <div className="flex gap-2 items-end flex-wrap">
        <div style={{ flex: 1, minWidth: 100 }}>
          <Input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="Latitude" />
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <Input type="number" step="any" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="Longitude" />
        </div>
        <Button size="sm" onClick={test} loading={loading}>Classify</Button>
      </div>
      {result && (
        <div style={{ marginTop: 10, padding: '10px 14px', borderRadius: 10, backgroundColor: m.bg, border: `1px solid ${m.color}22` }}>
          <p style={{ fontWeight: 700, fontSize: 13.5, color: m.color }}>
            {m.icon} {result.tier}{result.matched && result.area ? ` — ${result.area.name}` : ' — no area matched (fallback)'}
          </p>
          {result.area && <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{result.area.distanceKm} km from centre</p>}
        </div>
      )}
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────

export default function SurgePricing() {
  const toast = useToast();
  const [rules, setRules] = useState([]);
  const [areas, setAreas] = useState([]);
  const [status, setStatus] = useState('loading');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingArea, setEditingArea] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    try {
      const [rulesRes, areasRes] = await Promise.all([surgeService.listRules(), surgeService.listAreas()]);
      setRules(rulesRes.rules || []);
      setAreas(areasRes.areas || []);
      setStatus('success');
    } catch (e) { toast.error(e.message || 'Failed to load'); setStatus('error'); }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // PATCH /rules/:tier
  const handleSaveRule = async (tier, body) => {
    await surgeService.updateRule(tier, body);
    toast.success(`${tier} surge updated — applies to new quotes`);
    load();
  };

  // POST /areas
  const handleCreateArea = async (body) => { await surgeService.createArea(body); toast.success(`${body.name} added`); load(); };
  // PATCH /areas/:id
  const handleUpdateArea = async (body) => { await surgeService.updateArea(editingArea.id, body); toast.success('Area updated'); setEditingArea(null); load(); };
  // DELETE /areas/:id
  const handleDeactivateArea = async (area) => {
    if (!confirm(`Retire "${area.name}"?`)) return;
    await surgeService.deactivateArea(area.id); toast.success(`${area.name} retired`); load();
  };
  // PATCH /areas/:id { isActive: true }
  const handleReactivateArea = async (area) => {
    await surgeService.updateArea(area.id, { isActive: true }); toast.success(`${area.name} reactivated`); load();
  };

  const q = search.toLowerCase();
  const filteredAreas = areas.filter((a) => !q || a.name.toLowerCase().includes(q) || a.tier.toLowerCase().includes(q));

  if (status === 'loading') return <LoadingState label="Loading surge pricing…" />;

  return (
    <div>
      <PageHeader
        title="Surge Pricing"
        description="Configure surge fees per tier and define which areas fall under each tier."
        actions={<Button icon={Plus} onClick={() => { setEditingArea(null); setFormOpen(true); }}>Add Area</Button>}
      />

      {/* 1. Surge Fee Setup */}
      <div style={{ marginBottom: 24 }}>
        <SurgeFeeSetup rules={rules} onSave={handleSaveRule} />
      </div>

      {/* 2. Classify tester */}
      <div style={{ marginBottom: 24 }}>
        <ClassifyTester />
      </div>

      {/* 3. Service Areas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: '#6B7280' }}>
            <MapPin size={12} className="inline -mt-0.5 mr-1" /> Service Areas ({areas.length})
          </p>
          <SearchInput value={search} onChange={setSearch} placeholder="Search areas…" style={{ maxWidth: 220 }} />
        </div>

        {filteredAreas.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center', borderRadius: 14, border: '1.5px dashed #E8E8E4', backgroundColor: '#FAFAFA' }}>
            <MapPin size={32} className="mx-auto mb-2" style={{ color: '#D1D5DB' }} />
            <p style={{ fontWeight: 700, fontSize: 14, color: '#6B7280' }}>
              {search ? 'No areas match' : 'No surge areas yet'}
            </p>
            <p style={{ fontSize: 12.5, color: '#9A9A9A', marginTop: 4 }}>
              Add areas to map locations to tiers for location-based surge pricing.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredAreas.map((area) => {
              const m = TIER_META[area.tier] || TIER_META.METRO;
              return (
                <div key={area.id} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px', borderRadius: 14,
                  border: '1.5px solid #E8E8E4', backgroundColor: '#fff',
                  opacity: area.isActive ? 1 : 0.55,
                }}>
                  <span style={{ fontSize: 20 }}>{m.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: '#111' }}>
                      {area.name}
                      {!area.isActive && <Badge tone="slate" className="ml-2">Retired</Badge>}
                    </p>
                    <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
                      <Badge tone={m.tone} className="mr-2">{area.tier}</Badge>
                      {area.centreLat.toFixed(4)}, {area.centreLng.toFixed(4)} · {area.radiusKm} km
                      {area.note && <span style={{ color: '#9A9A9A' }}> — {area.note}</span>}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    <IconButton icon={Pencil} size="sm" label="Edit"
                      onClick={() => { setEditingArea(area); setFormOpen(true); }} />
                    {area.isActive
                      ? <IconButton icon={Trash2} size="sm" label="Retire" variant="danger" onClick={() => handleDeactivateArea(area)} />
                      : <IconButton icon={ToggleRight} size="sm" label="Reactivate" onClick={() => handleReactivateArea(area)} />
                    }
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AreaFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingArea(null); }}
        initial={editingArea}
        onSubmit={editingArea ? handleUpdateArea : handleCreateArea}
      />
    </div>
  );
}
