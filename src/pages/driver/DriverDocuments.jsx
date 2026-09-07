import { useState } from 'react';
import { Upload, CheckCircle, Clock, AlertTriangle, FileText, Camera } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Alert from '../../components/ui/Alert';
import { useToast } from '../../hooks/useToast';

const INITIAL_DOCS = [
  { id: 'dl',   name: 'Driving Licence',     status: 'verified',  expiry: '2028-04-15', required: true  },
  { id: 'aadh', name: 'Aadhaar Card',         status: 'verified',  expiry: null,          required: true  },
  { id: 'pan',  name: 'PAN Card',             status: 'pending',   expiry: null,          required: true  },
  { id: 'rc',   name: 'Vehicle RC',           status: 'pending',   expiry: '2027-09-01',  required: true  },
  { id: 'ins',  name: 'Vehicle Insurance',    status: 'rejected',  expiry: '2025-03-01',  required: true  },
  { id: 'pcc',  name: 'Police Clearance',     status: 'not_uploaded', expiry: null,       required: false },
  { id: 'med',  name: 'Medical Certificate',  status: 'not_uploaded', expiry: null,       required: false },
];

const STATUS_CONFIG = {
  verified:     { icon: CheckCircle, color: '#38B763', bg: '#f0fdf4', label: 'Verified'      },
  pending:      { icon: Clock,       color: '#F59E0B', bg: '#fffbeb', label: 'Under Review'  },
  rejected:     { icon: AlertTriangle,color:'#EF4444', bg: '#fef2f2', label: 'Rejected'      },
  not_uploaded: { icon: Upload,      color: '#6B7280', bg: '#F7F8FC', label: 'Not Uploaded'  },
};

export default function DriverDocuments() {
  const { user }  = useAuth();
  const toast     = useToast();
  const [docs, setDocs]         = useState(INITIAL_DOCS);
  const [uploadDoc, setUploadDoc] = useState(null);
  const [uploading, setUploading] = useState(false);

  const verified = docs.filter(d => d.status === 'verified').length;
  const total    = docs.filter(d => d.required).length;

  const handleUpload = async () => {
    setUploading(true);
    await new Promise(r => setTimeout(r, 1200));
    setDocs(prev => prev.map(d => d.id === uploadDoc.id ? { ...d, status: 'pending' } : d));
    toast.success(`${uploadDoc.name} submitted for review`);
    setUploading(false);
    setUploadDoc(null);
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#1F2937' }}>My Documents</h2>
      <p className="text-sm mb-5" style={{ color: '#6B7280' }}>
        Keep your documents up to date to remain eligible for trips.
      </p>

      {/* Progress */}
      <Card className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>Verification Progress</p>
          <p className="text-sm font-bold" style={{ color: '#3B65DB' }}>{verified}/{total}</p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#E5E7EB' }}>
          <div className="h-2 rounded-full transition-all" style={{ width: `${(verified/total)*100}%`, backgroundColor: '#38B763' }} />
        </div>
        <p className="text-xs mt-2" style={{ color: '#6B7280' }}>{verified} of {total} required documents verified</p>
      </Card>

      {docs.filter(d => d.status === 'rejected').length > 0 && (
        <Alert type="error" className="mb-4">
          One or more documents were rejected. Please re-upload with a clearer image.
        </Alert>
      )}

      {/* Document list */}
      <div className="space-y-2">
        {docs.map(doc => {
          const cfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.not_uploaded;
          const Ico = cfg.icon;
          const isExpired = doc.expiry && new Date(doc.expiry) < new Date();
          return (
            <div key={doc.id} className="flex items-center gap-3 rounded-2xl border p-4"
              style={{ backgroundColor: '#ffffff', borderColor: '#E5E7EB' }}>
              <div className="h-10 w-10 rounded-xl grid place-items-center shrink-0" style={{ backgroundColor: cfg.bg }}>
                <Ico size={18} style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold" style={{ color: '#1F2937' }}>{doc.name}</p>
                  {doc.required && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>Required</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium" style={{ color: cfg.color }}>{cfg.label}</span>
                  {doc.expiry && <span className="text-xs" style={{ color: isExpired ? '#EF4444' : '#6B7280' }}>
                    · {isExpired ? 'Expired' : 'Expires'} {doc.expiry}
                  </span>}
                </div>
              </div>
              {(doc.status === 'not_uploaded' || doc.status === 'rejected') && (
                <button
                  onClick={() => setUploadDoc(doc)}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg focus-ring shrink-0"
                  style={{ backgroundColor: '#eef2fb', color: '#3B65DB' }}>
                  <Upload size={13} /> Upload
                </button>
              )}
              {doc.status === 'verified' && (
                <FileText size={16} style={{ color: '#E5E7EB', shrink: 0 }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      <Modal open={!!uploadDoc} onClose={() => setUploadDoc(null)} title={`Upload ${uploadDoc?.name}`} size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setUploadDoc(null)}>Cancel</Button>
          <Button size="sm" icon={Upload} loading={uploading} onClick={handleUpload}>Submit for Review</Button>
        </>}
      >
        <div className="space-y-4">
          <div
            className="border-2 border-dashed rounded-xl h-36 flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ borderColor: '#849FE9', backgroundColor: '#eef2fb' }}>
            <Camera size={28} style={{ color: '#3B65DB' }} />
            <p className="text-sm font-semibold" style={{ color: '#3B65DB' }}>Tap to take photo or upload file</p>
            <p className="text-xs" style={{ color: '#6B7280' }}>JPG, PNG or PDF · Max 5 MB</p>
          </div>
          <Alert type="info">
            Ensure the document is clearly visible with all four corners in frame. Blurry images will be rejected.
          </Alert>
        </div>
      </Modal>
    </div>
  );
}
