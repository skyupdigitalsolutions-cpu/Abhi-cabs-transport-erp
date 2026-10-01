/** PasswordInput — MUI input with a show/hide eye button. */
import { useState } from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import MuiIconButton from '@mui/material/IconButton';
import { Eye, EyeOff } from 'lucide-react';
import Input from './Input';

export default function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      type={visible ? 'text' : 'password'}
      autoComplete="new-password"
      {...props}
      endAdornment={(
        <InputAdornment position="end">
          <MuiIconButton
            size="small" edge="end" tabIndex={-1}
            aria-label={visible ? 'Hide password' : 'Show password'}
            onClick={() => setVisible((v) => !v)}
            sx={{ color: '#9A9A9A', '&:hover': { color: '#111' } }}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </MuiIconButton>
        </InputAdornment>
      )}
    />
  );
}
