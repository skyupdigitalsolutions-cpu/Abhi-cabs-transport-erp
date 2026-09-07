import { useEffect, useState } from 'react';
import Drawer from '../ui/Drawer';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import DocumentUploader from '../ui/DocumentUploader';
import { useForm } from '../../hooks/useForm';
import { required, isPhone, isEmail } from '../../utils/validators';
import { KYC_STATUS } from '../../constants';
import { vehicleService } from '../../services';

/**
 * Matches the real, live /admin/drivers create/update schema exactly
 * (src/validators/driver.schemas.js on the backend):
 *
 *   Create requires: name, phone, licenceNumber
 *   Create optional: email, password (omit password → driver signs in by
 *     OTP instead), licenceExpiry, aadhaarLast4, kycStatus, assignedVehicleId
 *   Update: same fields, all optional, plus isOnline (admin can override)
 *
 * Phone must be a 10-digit Indian mobile number starting 6-9 — enforced by
 * the same isPhone validator already used elsewhere in the ERP, which
 * matches the backend's regex exactly.
 */
const EMPTY = {
  name: '', phone: '', email: '', password: '',
  licenceNumber: '', licenceExpiry: '', aadhaarLast4: '',
  kycStatus: 'PENDING', assignedVehicleId: '', isOnline: false,
  policeVerified: false, medicalChecked: false, inducted: false,
};

const DOC_DEFS = [
  { key: 'photo',   label: 'Profile Photo',          hint: 'Clear face photo · JPG/PNG · Max 5MB',        required: true  },
  { key: 'licence', label: 'Driving Licence',        hint: 'Front & back clearly visible · JPG/PNG/PDF',  required: true  },
  { key: 'aadhaar', label: 'Aadhaar Card',           hint: 'Both sides · JPG/PNG/PDF',                    required: true  },
  { key: 'pcc',     label: 'Police Clearance (PCC)', hint: 'Issued within last 6 months · PDF preferred', required: false },
];

export default function DriverFormDrawer({ open, onClose, initial, onSubmit }) {
  const isEdit = !!initial;
  const [activeTab, setActiveTab] = useState('info');
  const [docs, setDocs] = useState({});
  const [vehicles, setVehicles] = useState([]);

  useEffect(() => {
    if (!open) return;
    vehicleService.list({ limit: 100 }).then((r) => setVehicles(r.data || [])).catch(() => setVehicles([]));
  }, [open]);

  const toInitial = (d) => d ? {
    name: d.user?.name || d.name || '',
    phone: d.user?.phone || d.phone || '',
    email: d.user?.email || d.email || '',
    password: '',
    licenceNumber: d.licenceNumber || '',
    licenceExpiry: d.licenceExpiry ? d.licenceExpiry.slice(0, 10) : '',
    aadhaarLast4: d.aadhaarLast4 || '',
    kycStatus: d.kycStatus || 'PENDING',
    assignedVehicleId: d.assignedVehicleId || '',
    isOnline: !!d.isOnline,
    policeVerified: !!d.policeVerifiedAt,
    medicalChecked: !!d.medicalCheckedAt,
    inducted: !!d.inductedAt,
  } : EMPTY;

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit, setValues } = useForm({
    initialValues: toInitial(initial),
    schema: {
      name:  [required('Name')],
      phone: [required('Phone'), isPhone],
      email: [(v) => (v ? isEmail(v) : '')],
      licenceNumber: [required('Licence number')],
    },
    onSubmit: async (vals) => {
      const now = new Date().toISOString();
      const payload = {
        name: vals.name,
        phone: vals.phone,
        licenceNumber: vals.licenceNumber,
        licenceExpiry: vals.licenceExpiry || null,
        aadhaarLast4: vals.aadhaarLast4 || null,
        kycStatus: vals.kycStatus,
        assignedVehicleId: vals.assignedVehicleId || null,
      };
      if (vals.email) payload.email = vals.email;
      if (!isEdit && vals.password) payload.password = vals.password;
      if (isEdit) payload.isOnline = vals.isOnline;
      // documents: the real Driver model stores Cloudinary refs + metadata
      // here — Cloudinary isn't connected on the backend yet, so this sends
      // metadata only (name/type/size), never the raw file.
      payload.documents = buildDocumentMeta();
      await onSubmit(payload);
      onClose();
    },
  });

  useEffect(() => {
    setValues(toInitial(initial));
    setDocs({});
    setActiveTab('info');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial, open]);

  const buildDocumentMeta = () =>
    DOC_DEFS.reduce((acc, d) => {
      const file = docs[d.key];
      const existing = initial?.documents?.[d.key];
      acc[d.key] = file
        ? { name: file.name, type: file.type, size: file.size, status: 'pending_upload' }
        : existing || { status: 'not_uploaded' };
      return acc;
    }, {});

  const uploadedCount = DOC_DEFS.filter((d) => docs[d.key]).length;
  const requiredCount = DOC_DEFS.filter((d) => d.required).length;

  const TAB_STYLE = (tab) => ({
    padding: '8px 16px', fontSize: 13, fontWeight: 600,
    color: activeTab === tab ? '#3B65DB' : '#6B7280',
    background: 'none', border: 'none',
    borderBottom: `2px solid ${activeTab === tab ? '#3B65DB' : 'transparent'}`,
    cursor: 'pointer',
  });

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit Driver' : 'Add Driver'}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" onClick={handleSubmit} loading={submitting}>
            {isEdit ? 'Save Changes' : 'Add Driver'}
          </Button>
        </>
      }
    >
      {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}

      <div className="flex border-b mb-4" style={{ borderColor: '#E5E7EB' }}>
        <button style={TAB_STYLE('info')} onClick={() => setActiveTab('info')}>Personal Info</button>
        <button style={TAB_STYLE('docs')} onClick={() => setActiveTab('docs')}>
          Documents
          {uploadedCount > 0 && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>{uploadedCount}</span>
          )}
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {activeTab === 'info' && (
          <div className="space-y-4">
            <FormField label="Full name" required error={touched.name && errors.name}>
              <Input value={values.name} onChange={(e) => setValue('name', e.target.value)} onBlur={() => setFieldTouched('name')} maxLength={80} placeholder="e.g. Ravi Kumar" />
            </FormField>
            <FormField label="Phone number" required error={touched.phone && errors.phone} hint="Must be a 10-digit Indian mobile number starting 6–9.">
              <Input type="tel" inputMode="numeric" value={values.phone} onChange={(e) => setValue('phone', e.target.value.replace(/\D/g, ''))} onBlur={() => setFieldTouched('phone')} maxLength={10} placeholder="9876543210" />
            </FormField>
            <FormField label="Email (optional)" error={touched.email && errors.email}>
              <Input type="email" value={values.email} onChange={(e) => setValue('email', e.target.value)} onBlur={() => setFieldTouched('email')} placeholder="driver1@example.com" />
            </FormField>
            {!isEdit && (
              <FormField label="Password (optional)" hint="Leave blank to let the driver sign in by OTP instead of a password.">
                <Input type="password" value={values.password} onChange={(e) => setValue('password', e.target.value)} placeholder="Min 8 characters" />
              </FormField>
            )}
            <FormField label="Driving licence number" required error={touched.licenceNumber && errors.licenceNumber}>
              <Input value={values.licenceNumber} onChange={(e) => setValue('licenceNumber', e.target.value.toUpperCase())} onBlur={() => setFieldTouched('licenceNumber')} maxLength={32} placeholder="KA0520221234" />
            </FormField>
            <FormField label="Licence expiry">
              <Input type="date" value={values.licenceExpiry} onChange={(e) => setValue('licenceExpiry', e.target.value)} />
            </FormField>
            <FormField label="Aadhaar — last 4 digits only" hint="For privacy, only the last 4 digits are ever stored.">
              <Input value={values.aadhaarLast4} onChange={(e) => setValue('aadhaarLast4', e.target.value.replace(/\D/g, '').slice(0, 4))} maxLength={4} placeholder="1234" />
            </FormField>
            <FormField label="KYC status">
              <Select value={values.kycStatus} onChange={(e) => setValue('kycStatus', e.target.value)}
                options={Object.values(KYC_STATUS).map((s) => ({ value: s, label: s.charAt(0) + s.slice(1).toLowerCase() }))} />
            </FormField>
            <FormField label="Assigned vehicle">
              <Select value={values.assignedVehicleId} onChange={(e) => setValue('assignedVehicleId', e.target.value)} placeholder="None"
                options={vehicles.map((v) => ({ value: v.id, label: `${v.registrationNumber} · ${v.vehicleClass}` }))} />
            </FormField>
            {isEdit && (
              <label className="flex items-center gap-2 text-sm" style={{ color: '#374151' }}>
                <input type="checkbox" checked={values.isOnline} onChange={(e) => setValue('isOnline', e.target.checked)} />
                Online (available for dispatch)
              </label>
            )}

            <div className="pt-2">
              <p className="text-xs font-semibold mb-2" style={{ color: '#1F2937' }}>Compliance checklist</p>
              <div className="space-y-2">
                {[
                  ['policeVerified', 'Police verification completed'],
                  ['medicalChecked', 'Medical check completed'],
                  ['inducted', 'Induction / onboarding completed'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm" style={{ color: '#374151' }}>
                    <input type="checkbox" checked={values[key]} onChange={(e) => setValue(key, e.target.checked)} />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'docs' && (
          <div className="space-y-5">
            <Alert type="info">
              Files can be selected and previewed here now. Actually storing them needs Cloudinary connected on
              the backend — until then, document metadata is saved but the files themselves aren't persisted yet.
            </Alert>
            {DOC_DEFS.map((d) => (
              <DocumentUploader
                key={d.key}
                label={d.label}
                hint={d.hint}
                required={d.required}
                value={docs[d.key]}
                onChange={(file) => setDocs((prev) => ({ ...prev, [d.key]: file }))}
              />
            ))}
            <div className="rounded-xl p-3 text-xs" style={{ backgroundColor: '#F7F8FC', color: '#6B7280' }}>
              <strong>{uploadedCount}</strong> of <strong>{requiredCount}</strong> required documents selected.
            </div>
          </div>
        )}
      </form>
    </Drawer>
  );
}
