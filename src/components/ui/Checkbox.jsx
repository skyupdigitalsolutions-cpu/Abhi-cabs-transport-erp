export default function Checkbox({ label, className = '', ...props }) {
  return (
    <label
      className={`inline-flex items-center gap-2 text-sm cursor-pointer ${className}`}
      style={{ color: '#1F2937' }}
    >
      <input
        type="checkbox"
        className="h-4 w-4 rounded focus-ring"
        style={{ accentColor: '#3B65DB' }}
        {...props}
      />
      {label}
    </label>
  );
}
