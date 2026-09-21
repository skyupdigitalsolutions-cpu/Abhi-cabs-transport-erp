import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, X, CheckCircle, AlertTriangle, Camera, ExternalLink } from 'lucide-react';

const ALLOWED = ['image/jpeg','image/png','image/webp','application/pdf'];
const MAX_MB   = 5;

/**
 * FIX: `value` was accepted as a prop but never actually read anywhere in
 * this component — only a file picked THIS session (via handleFile, kept in
 * local `preview` state) ever rendered a preview. A vehicle reopened for
 * editing after a real upload already happened therefore always looked like
 * nothing had ever been uploaded, even though it genuinely had — the file
 * was sitting in Cloudinary the whole time, just never shown.
 *
 * `value` now accepts either shape:
 *   - a string/object with `.url` — an already-uploaded file (from the real
 *     backend, e.g. vehicle.documents.PHOTO = { url, uploadedAt })
 *   - the local { name, dataUrl, ... } shape this component itself produces
 *     when a NEW file is picked in this session (unchanged)
 * Selecting a new file always takes over the display — replacing an
 * existing upload is exactly what re-uploading means here.
 */
export default function DocumentUploader({ label, hint, value, onChange, required }) {
  const inputRef  = useRef(null);
  const [dragging,setDragging] = useState(false);
  const [preview, setPreview]  = useState(null);
  const [error,   setError]    = useState('');

  // Only seed from an existing remote upload if nothing has been picked
  // locally this session yet — a fresh selection must never be clobbered by
  // the old value re-rendering.
  useEffect(() => {
    if (preview) return;
    const existingUrl = typeof value === 'string' ? value : value?.url;
    if (existingUrl) {
      setPreview({
        name: value?.name || 'Uploaded file',
        uploadedAt: value?.uploadedAt || null,
        type: /\.(png|jpe?g|webp)(\?|$)/i.test(existingUrl) ? 'image/*' : 'application/pdf',
        dataUrl: existingUrl,
        isExisting: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleFile = (file) => {
    setError('');
    if (!ALLOWED.includes(file.type)) { setError('Only JPG, PNG, WebP or PDF allowed.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`File too large. Max ${MAX_MB} MB.`); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview({ name: file.name, size: (file.size/1024).toFixed(0)+'KB', type: file.type, dataUrl: e.target.result, isExisting: false });
      onChange?.({ name: file.name, size: file.size, type: file.type, dataUrl: e.target.result, file });
    };
    reader.readAsDataURL(file);
  };

  const clear = (e) => {
    e.stopPropagation();
    setPreview(null);
    setError('');
    onChange?.(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const isImage = preview?.type?.startsWith('image/');

  return (
    <div>
      {label && (
        <p className="text-sm font-medium mb-1.5" style={{ color:'#1F2937' }}>
          {label} {required && <span style={{ color:'#EF4444' }}>*</span>}
        </p>
      )}

      {!preview ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if(f) handleFile(f); }}
          className="border-2 border-dashed rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-all"
          style={{
            borderColor: dragging ? '#3B65DB' : error ? '#EF4444' : '#E5E7EB',
            backgroundColor: dragging ? '#eef2fb' : '#F7F8FC',
          }}>
          <div className="h-10 w-10 rounded-xl grid place-items-center"
            style={{ backgroundColor: dragging ? '#3B65DB':'#E5E7EB' }}>
            <Upload size={18} style={{ color: dragging ? '#fff':'#6B7280' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold" style={{ color:'#1F2937' }}>
              Click to upload or drag & drop
            </p>
            <p className="text-xs mt-0.5" style={{ color:'#6B7280' }}>
              {hint || 'JPG, PNG, WebP or PDF · Max 5 MB'}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11.5px] px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor:'#eef2fb', color:'#3B65DB' }}>
              📎 Browse File
            </span>
            <span className="text-[11.5px] px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor:'#f0fdf4', color:'#38B763' }}>
              📸 Camera
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor:'#E5E7EB' }}>
          {isImage && (
            <a href={preview.dataUrl} target="_blank" rel="noopener noreferrer"
              className="h-32 overflow-hidden block" style={{ backgroundColor:'#F7F8FC' }}>
              <img src={preview.dataUrl} alt="preview" className="w-full h-full object-contain" />
            </a>
          )}
          <div className="flex items-center gap-3 px-3 py-2.5" style={{ backgroundColor:'#F7F8FC' }}>
            <div className="h-8 w-8 rounded-lg grid place-items-center shrink-0"
              style={{ backgroundColor:'#eef2fb' }}>
              {isImage
                ? <CheckCircle size={16} style={{ color:'#38B763' }} />
                : <FileText size={16} style={{ color:'#3B65DB' }} />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate" style={{ color:'#1F2937' }}>{preview.name}</p>
              <p className="text-xs" style={{ color:'#6B7280' }}>
                {preview.isExisting
                  ? `Already uploaded${preview.uploadedAt ? ` · ${new Date(preview.uploadedAt).toLocaleDateString()}` : ''}`
                  : preview.size}
              </p>
            </div>
            {preview.isExisting && (
              <a href={preview.dataUrl} target="_blank" rel="noopener noreferrer"
                className="p-1 rounded focus-ring" style={{ color:'#3B65DB' }} title="View full size">
                <ExternalLink size={15} />
              </a>
            )}
            <button onClick={clear} className="p-1 rounded focus-ring" style={{ color:'#EF4444' }} title={preview.isExisting ? 'Remove and replace' : 'Remove'}>
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-center gap-1 text-xs mt-1.5" style={{ color:'#EF4444' }}>
          <AlertTriangle size={12} /> {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED.join(',')}
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if(f) handleFile(f); }}
        capture="environment"
      />
    </div>
  );
}
