/** Checkbox — MUI <Checkbox> + label. Same props: label, checked, onChange(e), disabled, id, className. */
import MuiCheckbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';

export default function Checkbox({ label, className = '', checked, onChange, disabled, id, ...props }) {
  const box = <MuiCheckbox id={id} checked={!!checked} onChange={onChange} disabled={disabled} size="small" {...props} />;
  if (!label) return <span className={className}>{box}</span>;
  return (
    <FormControlLabel
      className={className}
      control={box}
      label={label}
      disabled={disabled}
      sx={{ m: 0, gap: 0.5, alignItems: 'center', '& .MuiFormControlLabel-label': { fontSize: 13.5, fontWeight: 500, color: '#1F2937' } }}
    />
  );
}
