/** Switch — MUI <Switch> styled as an iOS/Ionic toggle (see theme). onChange(checked). */
import MuiSwitch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

export default function Switch({ checked, onChange, label, id, disabled }) {
  const control = <MuiSwitch id={id} checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />;
  if (!label) return control;
  return (
    <FormControlLabel
      control={control}
      label={label}
      disabled={disabled}
      sx={{ m: 0, gap: 1.5, '& .MuiFormControlLabel-label': { fontSize: 13.5, fontWeight: 600, color: '#1F2937' } }}
    />
  );
}
