/** SearchInput — MUI input with a search icon and a clear button. onChange(value). */
import InputAdornment from '@mui/material/InputAdornment';
import MuiIconButton from '@mui/material/IconButton';
import { Search, X } from 'lucide-react';
import Input from './Input';

export default function SearchInput({ value, onChange, placeholder = 'Search...', className, style }) {
  return (
    <div className={className} style={style}>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        startAdornment={(
          <InputAdornment position="start" sx={{ color: '#9A9A9A', '.Mui-focused &': { color: '#E6AC00' } }}>
            <Search size={15} />
          </InputAdornment>
        )}
        endAdornment={value ? (
          <InputAdornment position="end">
            <MuiIconButton size="small" edge="end" aria-label="Clear search" onClick={() => onChange('')} sx={{ color: '#9A9A9A', '&:hover': { color: '#111' } }}>
              <X size={14} />
            </MuiIconButton>
          </InputAdornment>
        ) : null}
      />
    </div>
  );
}
