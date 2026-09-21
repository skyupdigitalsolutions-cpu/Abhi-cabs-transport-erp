import { useEffect, useState } from 'react';
import Drawer from '../ui/Drawer';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import DocumentUploader from '../ui/DocumentUploader';
import { useForm } from '../../hooks/useForm';
import { required } from '../../utils/validators';
import { VEHICLE_STATUS } from '../../constants';
import { apiClient } from '../../services/apiClient';
import { useToast } from '../../hooks/useToast';
import {
  CheckCircle, AlertTriangle, Clock, Upload,
  FileText, Shield, Leaf, Key, ScrollText, Camera,
} from 'lucide-react';

/**
 * Top-level fields are confirmed directly against the real, live
 * /admin/vehicles create/update schema (src/validators/vehicle.schemas.js):
 *   registrationNumber, vehicleClass, makeModel, year, colour,
 *   seatingCapacity, status, cityId, insuranceExpiry, fitnessExpiry,
 *   permitExpiry, pucExpiry, odometerKm, documents (free-form JSON).
 *   odometerKm is intentionally not exposed on this form (removed on
 *   request) — omitted from the payload entirely rather than sent as 0, so
 *   editing a vehicle never resets its actual reading; a new vehicle still
 *   gets 0 from the backend's own schema default.
 *
 * There is no "masters/vehicle rate card" concept on this backend — vehicle
 * class is a free-text field the real schema validates loosely
 * (1–24 characters), not a lookup table. The four real classes seeded on
 * this backend are hatchback / sedan / suv / tempo (see fare config seed
 * data), offered here as suggestions, not an enforced enum.
 *
 * The rich per-document sub-fields below (policy number, issuing RTO, etc.)
 * aren't individual backend columns — they're bundled into the real
 * `documents` JSON field, which accepts arbitrary structured data. Only the
 * four expiry dates it captures are ALSO mapped to their real top-level
 * columns, since those drive compliance filtering/sorting on the backend.
 */
const VEHICLE_CLASS_SUGGESTIONS = ['hatchback', 'sedan', 'suv', 'tempo'];

const DOC_CONFIG = [
  {
    key: 'rc', docType: 'RC', label: 'Registration Certificate (RC)', short: 'RC', icon: ScrollText,
    color: '#3B65DB', bg: '#eef2fb', required: true,
    fields: [
      { key: 'rcNumber', label: 'RC Number', placeholder: 'e.g. KA0520224567890', required: true },
      { key: 'rcOwnerName', label: "Registered Owner's Name", placeholder: 'As on RC book', required: true },
      { key: 'rcIssueDate', label: 'Issue Date', type: 'date', required: false },
      { key: 'rcIssuingRTO', label: 'Issuing RTO', placeholder: 'e.g. RTO Bengaluru', required: false },
    ],
  },
  {
    key: 'insurance', docType: 'INSURANCE', label: 'Insurance Policy', short: 'Insurance', icon: Shield,
    color: '#38B763', bg: '#f0fdf4', required: true, expiryKey: 'insuranceExpiry',
    fields: [
      { key: 'insurancePolicyNo', label: 'Policy Number', placeholder: 'e.g. OG-24-1234-5678', required: true },
      { key: 'insuranceCompany', label: 'Insurance Company', placeholder: 'e.g. HDFC Ergo', required: true },
      { key: 'insuranceType', label: 'Insurance Type', type: 'select', options: ['Comprehensive', 'Third Party', 'Zero Depreciation'], required: false },
      { key: 'insuranceStartDate', label: 'Start Date', type: 'date', required: false },
      { key: 'insuranceExpiry', label: 'Expiry Date', type: 'date', required: true },
      { key: 'insurancePremium', label: 'Premium Amount (₹)', type: 'number', placeholder: 'e.g. 25000', required: false },
    ],
  },
  {
    key: 'puc', docType: 'PUC', label: 'Pollution Under Control (PUC)', short: 'PUC', icon: Leaf,
    color: '#10b981', bg: '#ecfdf5', required: true, expiryKey: 'pucExpiry',
    fields: [
      { key: 'pucCertNo', label: 'Certificate Number', placeholder: 'e.g. PUC2024KA001234', required: true },
      { key: 'pucIssuedAt', label: 'Issue Date', type: 'date', required: false },
      { key: 'pucExpiry', label: 'Valid Up To', type: 'date', required: true },
      { key: 'pucTestCenter', label: 'Testing Center', placeholder: 'e.g. Koramangala RTO', required: false },
    ],
  },
  {
    key: 'permit', docType: 'PERMIT', label: 'Vehicle Permit', short: 'Permit', icon: Key,
    color: '#7c3aed', bg: '#f5f3ff', required: false, expiryKey: 'permitExpiry',
    fields: [
      { key: 'permitNumber', label: 'Permit Number', placeholder: 'e.g. KA/03/STG/2024', required: false },
      { key: 'permitType', label: 'Permit Type', type: 'select', options: ['State Carriage', 'Contract Carriage', 'National Permit', 'Tourist Permit'], required: false },
      { key: 'permitIssuedAt', label: 'Issue Date', type: 'date', required: false },
      { key: 'permitExpiry', label: 'Valid Up To', type: 'date', required: false },
      { key: 'permitAuthority', label: 'Issuing Authority', placeholder: 'e.g. STA Karnataka', required: false },
    ],
  },
  {
    key: 'fitness', docType: 'FITNESS', label: 'Fitness Certificate', short: 'Fitness', icon: FileText,
    color: '#F59E0B', bg: '#fffbeb', required: false, expiryKey: 'fitnessExpiry',
    fields: [
      { key: 'fitnessCertNo', label: 'Certificate Number', placeholder: 'e.g. FC/KA/2024/001', required: false },
      { key: 'fitnessIssuedAt', label: 'Issue Date', type: 'date', required: false },
      { key: 'fitnessExpiry', label: 'Valid Up To', type: 'date', required: false },
      { key: 'fitnessIssuingRTO', label: 'Issuing RTO', placeholder: 'e.g. RTO Bengaluru', required: false },
    ],
  },
  {
    // Plain identifying photo of the vehicle — no expiry, no required
    // reference fields, just an image. Uses the exact same real upload
    // pipeline as the compliance documents above (docType: 'PHOTO' is
    // accepted by the backend specifically for this — see
    // ADMIN_VEHICLE_DOC_TYPES in vehicle.schemas.js).
    key: 'photo', docType: 'PHOTO', label: 'Vehicle Photo', short: 'Photo', icon: Camera,
    color: '#0ea5e9', bg: '#f0f9ff', required: false,
    fields: [],
  },
];

const EMPTY_VEHICLE = {
  registrationNumber: '', vehicleClass: '', makeModel: '', year: '', colour: '',
  seatingCapacity: 4, status: 'AVAILABLE',
};

function expiryStatus(dateStr) {
  if (!dateStr) return null;
  const days = Math.ceil((new Date(dateStr) - new Date()) / 86400000);
  if (days < 0) return { label: 'Expired', color: '#EF4444', bg: '#fef2f2', icon: AlertTriangle };
  if (days <= 30) return { label: `Expires in ${days}d`, color: '#F59E0B', bg: '#fffbeb', icon: Clock };
  return { label: 'Valid', color: '#38B763', bg: '#f0fdf4', icon: CheckCircle };
}

function DocPanel({ cfg, docValues, onChangeField, fileValue, onChangeFile, uploadStatus }) {
  const Icon = cfg.icon;
  const expiry = cfg.expiryKey ? expiryStatus(docValues[cfg.expiryKey]) : null;

  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: '#E5E7EB' }}>
      <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: cfg.bg, borderBottom: `1px solid ${cfg.bg}` }}>
        <div className="h-9 w-9 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: cfg.color }}>
          <Icon size={16} color="#fff" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{cfg.label}</p>
          {cfg.required
            ? <span className="text-[11.5px] font-semibold" style={{ color: cfg.color }}>Required</span>
            : <span className="text-[11.5px]" style={{ color: '#6B7280' }}>Optional</span>}
        </div>
        {expiry && (
          <span className="flex items-center gap-1 text-[12.5px] font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: expiry.bg, color: expiry.color }}>
            <expiry.icon size={11} /> {expiry.label}
          </span>
        )}
      </div>
      <div className="p-4 space-y-3">
        {cfg.fields.map((f) => (
          <FormField key={f.key} label={f.label} required={f.required}>
            {f.type === 'select' ? (
              <Select value={docValues[f.key] || ''} onChange={(e) => onChangeField(f.key, e.target.value)}
                placeholder={`Select ${f.label.toLowerCase()}…`} options={(f.options || []).map((o) => ({ value: o, label: o }))} />
            ) : (
              <Input type={f.type || 'text'} value={docValues[f.key] || ''} onChange={(e) => onChangeField(f.key, e.target.value)}
                placeholder={f.placeholder || ''} style={f.type === 'date' ? { colorScheme: 'light' } : {}} />
            )}
          </FormField>
        ))}
        <DocumentUploader label="Upload Document" hint="JPG, PNG or PDF · Max 5 MB" value={fileValue} onChange={onChangeFile} />
        {/* Real upload feedback — appears only while/after Add Vehicle /
            Save Changes actually runs the upload request for this file. */}
        {uploadStatus === 'uploading' && (
          <p className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: '#3B65DB' }}>
            <Clock size={12} className="animate-pulse" /> Uploading…
          </p>
        )}
        {uploadStatus === 'done' && (
          <p className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: '#38B763' }}>
            <CheckCircle size={12} /> Uploaded
          </p>
        )}
        {uploadStatus === 'error' && (
          <p className="text-[12px] font-medium flex items-center gap-1.5" style={{ color: '#EF4444' }}>
            <AlertTriangle size={12} /> Upload failed — try again after saving
          </p>
        )}
      </div>
    </div>
  );
}

function ComplianceTab({ docValues, files }) {
  const rows = DOC_CONFIG.map((cfg) => {
    const expiryDate = cfg.expiryKey ? docValues[cfg.expiryKey] : null;
    const exp = expiryDate ? expiryStatus(expiryDate) : null;
    const hasFile = !!files[cfg.key];
    const hasNumber = !!docValues[cfg.fields.find((f) => f.required)?.key];
    const status = !hasNumber ? 'missing' : exp?.label === 'Expired' ? 'expired' : exp?.label?.includes('Expires') ? 'expiring' : 'ok';
    return { cfg, expiryDate, exp, hasFile, hasNumber, status };
  });

  const allOk = rows.filter((r) => r.cfg.required && r.status === 'ok').length;
  const requiredCount = rows.filter((r) => r.cfg.required).length;
  const hasExpired = rows.some((r) => r.status === 'expired');
  const hasExpiring = rows.some((r) => r.status === 'expiring');

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 border" style={{ backgroundColor: hasExpired ? '#fef2f2' : hasExpiring ? '#fffbeb' : '#f0fdf4', borderColor: hasExpired ? '#fecaca' : hasExpiring ? '#fde68a' : '#bbf7d0' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-bold" style={{ color: '#1F2937' }}>Compliance Status</p>
          <span className="text-sm font-black" style={{ color: hasExpired ? '#EF4444' : hasExpiring ? '#F59E0B' : '#38B763' }}>
            {allOk}/{requiredCount} Required
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${requiredCount ? (allOk / requiredCount) * 100 : 0}%`, backgroundColor: hasExpired ? '#EF4444' : hasExpiring ? '#F59E0B' : '#38B763' }} />
        </div>
      </div>
      {rows.map(({ cfg, expiryDate, exp, hasFile, hasNumber, status }) => {
        const Icon = cfg.icon;
        const StatusIcon = status === 'ok' ? CheckCircle : status === 'expired' ? AlertTriangle : status === 'expiring' ? Clock : Upload;
        const statusColor = { ok: '#38B763', expired: '#EF4444', expiring: '#F59E0B', missing: '#6B7280' }[status];
        const statusBg = { ok: '#f0fdf4', expired: '#fef2f2', expiring: '#fffbeb', missing: '#F7F8FC' }[status];
        const statusLabel = { ok: 'Valid', expired: 'Expired', expiring: exp?.label, missing: 'Not filled' }[status];
        return (
          <div key={cfg.key} className="rounded-xl border p-4" style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                <Icon size={17} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-bold" style={{ color: '#1F2937' }}>{cfg.label}</p>
                  {cfg.required && <span className="text-[11.5px] px-1.5 py-0.5 rounded font-semibold" style={{ backgroundColor: cfg.bg, color: cfg.color }}>Required</span>}
                </div>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1 text-[12.5px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: statusBg, color: statusColor }}>
                    <StatusIcon size={10} /> {statusLabel}
                  </span>
                  {expiryDate && <span className="text-xs" style={{ color: '#6B7280' }}>Expires: {new Date(expiryDate).toLocaleDateString('en-IN')}</span>}
                  {hasFile && <span className="flex items-center gap-1 text-[12.5px]" style={{ color: '#38B763' }}><FileText size={10} /> Doc uploaded</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function VehicleFormDrawer({ open, onClose, initial, onSubmit }) {
  const [activeTab, setActiveTab] = useState('info');
  const [docValues, setDocValues] = useState({});
  const [files, setFiles] = useState({});
  const [existingDocs, setExistingDocs] = useState({}); // cfg.key -> { url, publicId, uploadedAt }
  const [uploadStatus, setUploadStatus] = useState({}); // cfg.key -> 'uploading' | 'done' | 'error'
  const toast = useToast();

  const toInitialValues = (v) => v ? {
    registrationNumber: v.registrationNumber || '',
    vehicleClass: v.vehicleClass || '',
    makeModel: v.makeModel || '',
    year: v.year || '',
    colour: v.colour || '',
    seatingCapacity: v.seatingCapacity ?? 4,
    status: v.status || 'AVAILABLE',
  } : EMPTY_VEHICLE;

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: toInitialValues(initial),
    schema: {
      registrationNumber: [required('Registration number')],
      vehicleClass: [required('Vehicle class')],
    },
    onSubmit: async (vals) => {
      // FIX: this previously only ever recorded whether a file was picked
      // (fileSelected / fileName) — the actual File object was captured in
      // browser state and then discarded, never sent anywhere. It's now
      // really uploaded, per selected file, via the real
      // POST /admin/vehicles/:id/documents endpoint (multipart, backed by
      // Cloudinary through storageService on the backend — the same
      // pipeline driverSelf.routes.js already used for a driver's own
      // vehicle documents, just not previously wired up on the admin side).
      //
      // The reference sub-fields (policy numbers, issuing authorities, etc.)
      // aren't individual backend columns — they still go into the vehicle's
      // `documents` JSON field as before, entirely separately from the file
      // upload itself.
      const documents = DOC_CONFIG.reduce((acc, cfg) => {
        acc[cfg.key] = cfg.fields.reduce((f, field) => { f[field.key] = docValues[field.key] || ''; return f; }, {});
        return acc;
      }, {});

      const vehicle = await onSubmit({
        registrationNumber: vals.registrationNumber,
        vehicleClass: vals.vehicleClass,
        makeModel: vals.makeModel || null,
        year: vals.year ? Number(vals.year) : null,
        colour: vals.colour || null,
        seatingCapacity: Number(vals.seatingCapacity) || 4,
        status: vals.status,
        // Real top-level compliance date columns — mapped from the matching
        // document panel's expiry field.
        insuranceExpiry: docValues.insuranceExpiry || null,
        fitnessExpiry: docValues.fitnessExpiry || null,
        permitExpiry: docValues.permitExpiry || null,
        pucExpiry: docValues.pucExpiry || null,
        documents,
      });

      // Vehicle record is saved at this point regardless of what happens
      // next — a failed or slow document upload must never look like the
      // whole "Add Vehicle" action failed, since the vehicle itself is
      // already real and already in the fleet.
      const vehicleId = vehicle?.id || initial?.id;
      const selected = DOC_CONFIG.filter((cfg) => files[cfg.key]);
      if (vehicleId && selected.length > 0) {
        await Promise.all(selected.map(async (cfg) => {
          setUploadStatus((p) => ({ ...p, [cfg.key]: 'uploading' }));
          try {
            const formData = new FormData();
            formData.append('file', files[cfg.key]);
            formData.append('docType', cfg.docType);
            if (cfg.expiryKey && docValues[cfg.expiryKey]) formData.append('expiry', docValues[cfg.expiryKey]);
            await apiClient.upload(`/admin/vehicles/${vehicleId}/documents`, formData);
            setUploadStatus((p) => ({ ...p, [cfg.key]: 'done' }));
          } catch (e) {
            setUploadStatus((p) => ({ ...p, [cfg.key]: 'error' }));
            // Distinguish "the upload endpoint isn't deployed on this
            // backend yet" from a genuine upload failure (bad file, network
            // blip, etc.) — the vehicle itself is still saved either way,
            // this only affects the attached file for this one document.
            const notDeployed = e.code === 'ENDPOINT_NOT_IMPLEMENTED' || e.status === 404;
            toast.error(
              notDeployed
                ? `${cfg.label}: file upload isn't available on this backend yet — the vehicle was saved without it.`
                : `${cfg.label} upload failed: ${e.message || 'unknown error'}`
            );
          }
        }));
      }

      onClose();
    },
  });

  useEffect(() => {
    setValues(toInitialValues(initial));
    if (initial?.documents) {
      const preDoc = {};
      DOC_CONFIG.forEach((cfg) => {
        const saved = initial.documents[cfg.key];
        if (saved) cfg.fields.forEach((f) => { if (saved[f.key]) preDoc[f.key] = saved[f.key]; });
      });
      if (initial.insuranceExpiry) preDoc.insuranceExpiry = initial.insuranceExpiry.slice(0, 10);
      if (initial.fitnessExpiry) preDoc.fitnessExpiry = initial.fitnessExpiry.slice(0, 10);
      if (initial.permitExpiry) preDoc.permitExpiry = initial.permitExpiry.slice(0, 10);
      if (initial.pucExpiry) preDoc.pucExpiry = initial.pucExpiry.slice(0, 10);
      setDocValues(preDoc);

      // FIX: a real upload (via the /admin/vehicles/:id/documents endpoint)
      // stores its result at documents[docType] — e.g. documents.PHOTO,
      // documents.INSURANCE, uppercase — completely separate from the
      // lowercase reference-field keys read above (documents.photo,
      // documents.insurance). Nothing ever read the uppercase keys, so a
      // vehicle's actual uploaded photo/documents never appeared when
      // reopening it for editing, even though they were sitting in
      // Cloudinary the whole time. This reads them into their own state so
      // DocumentUploader can actually show what's already there.
      const existing = {};
      DOC_CONFIG.forEach((cfg) => {
        const uploaded = initial.documents[cfg.docType];
        if (uploaded?.url) existing[cfg.key] = uploaded;
      });
      setExistingDocs(existing);
    } else {
      setDocValues({});
      setExistingDocs({});
    }
    setFiles({});
    setActiveTab('info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  const uploadedFiles = Object.keys(files).length;
  const filledDocs = DOC_CONFIG.filter((cfg) => docValues[cfg.fields.find((f) => f.required)?.key]).length;

  const TABS = [
    { key: 'info', label: 'Vehicle Info' },
    { key: 'documents', label: `Documents${filledDocs > 0 ? ` (${filledDocs})` : ''}` },
    { key: 'compliance', label: 'Compliance' },
  ];

  const TAB_STYLE = (tab) => ({
    padding: '8px 14px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
    background: 'none', border: 'none', whiteSpace: 'nowrap',
    borderBottom: `2px solid ${activeTab === tab ? '#3B65DB' : 'transparent'}`,
    color: activeTab === tab ? '#3B65DB' : '#6B7280',
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Vehicle' : 'Add Vehicle'}
      footer={<>
        <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
        <Button size="sm" onClick={handleSubmit} loading={submitting}>{initial ? 'Save Changes' : 'Add Vehicle'}</Button>
      </>}
    >
      {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}

      <div className="flex border-b mb-4 overflow-x-auto" style={{ borderColor: '#E5E7EB' }}>
        {TABS.map((t) => <button key={t.key} style={TAB_STYLE(t.key)} onClick={() => setActiveTab(t.key)}>{t.label}</button>)}
      </div>

      {activeTab === 'info' && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <FormField label="Registration number" required error={touched.registrationNumber && errors.registrationNumber} hint="e.g. KA05AB1234">
            <Input value={values.registrationNumber} onChange={(e) => setValue('registrationNumber', e.target.value.toUpperCase())} onBlur={() => setFieldTouched('registrationNumber')} maxLength={16} placeholder="KA05AB1234" />
          </FormField>
          <FormField label="Vehicle class" required error={touched.vehicleClass && errors.vehicleClass} hint="Free text — hatchback, sedan, suv, tempo are the classes this backend currently prices.">
            <Input list="vehicle-class-suggestions" value={values.vehicleClass} onChange={(e) => setValue('vehicleClass', e.target.value.toLowerCase())} onBlur={() => setFieldTouched('vehicleClass')} placeholder="sedan" />
            <datalist id="vehicle-class-suggestions">
              {VEHICLE_CLASS_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </FormField>
          <FormField label="Make & model">
            <Input value={values.makeModel} onChange={(e) => setValue('makeModel', e.target.value)} placeholder="e.g. Maruti Suzuki Dzire" maxLength={80} />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Year">
              <Input type="number" value={values.year} onChange={(e) => setValue('year', e.target.value)} placeholder="2023" />
            </FormField>
            <FormField label="Colour">
              <Input value={values.colour} onChange={(e) => setValue('colour', e.target.value)} placeholder="White" maxLength={40} />
            </FormField>
          </div>
          <FormField label="Seating capacity">
            <Input type="number" min={1} max={50} value={values.seatingCapacity} onChange={(e) => setValue('seatingCapacity', e.target.value)} />
          </FormField>
          <FormField label="Status" required>
            <Select value={values.status} onChange={(e) => setValue('status', e.target.value)}
              options={Object.values(VEHICLE_STATUS).map((s) => ({ value: s, label: s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase()) }))} />
          </FormField>
        </form>
      )}

      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: '#F7F8FC', color: '#6B7280' }}>
            Fill in document details and upload scanned copies. Expiry dates from Insurance, PUC, Permit, and
            Fitness are saved to the vehicle's real compliance fields; everything else is saved as reference detail.
          </div>
          {DOC_CONFIG.map((cfg) => (
            <DocPanel key={cfg.key} cfg={cfg} docValues={docValues}
              onChangeField={(fieldKey, val) => setDocValues((prev) => ({ ...prev, [fieldKey]: val }))}
              fileValue={files[cfg.key] || existingDocs[cfg.key]}
              onChangeFile={(file) => setFiles((prev) => ({ ...prev, [cfg.key]: file }))}
              uploadStatus={uploadStatus[cfg.key]} />
          ))}
        </div>
      )}

      {activeTab === 'compliance' && <ComplianceTab docValues={docValues} files={files} />}
    </Drawer>
  );
}
