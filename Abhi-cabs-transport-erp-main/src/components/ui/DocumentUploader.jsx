import { useState, useRef } from 'react';
import { Upload, FileText, X, CheckCircle, AlertTriangle, Camera } from 'lucide-react';

const ALLOWED = ['image/jpeg','image/png','image/webp','application/pdf'];
const MAX_MB   = 5;

export default function DocumentUploader({ label, hint, value, onChange, required }) {
  const inputRef  = useRef(null);
  const [dragging,setDragging] = useState(false);
  const [preview, setPreview]  = useState(null);
  const [error,   setError]    = useState('');

  const handleFile = (file) => {
    setError('');
    if (!ALLOWED.includes(file.type)) { setError('Only JPG, PNG, WebP or PDF allowed.'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { setError(`File too large. Max ${MAX_MB} MB.`); return; }

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview({ name: file.name, size: (file.size/1024).toFixed(0)+'KB', type: file.type, dataUrl: e.target.result });
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
            <div className="h-32 overflow-hidden" style={{ backgroundColor:'#F7F8FC' }}>
              <img src={preview.dataUrl} alt="preview" className="w-full h-full object-contain" />
            </div>
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
              <p className="text-xs" style={{ color:'#6B7280' }}>{preview.size}</p>
            </div>
            <button onClick={clear} className="p-1 rounded focus-ring" style={{ color:'#EF4444' }}>
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
