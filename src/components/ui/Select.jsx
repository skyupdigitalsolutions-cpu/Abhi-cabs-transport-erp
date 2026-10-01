/**
 * Select — MUI <Select>, or MUI <Autocomplete> when `searchable` (default for
 * lists longer than 6 options).
 *
 * API unchanged: { value, onChange(e), onBlur(e), options:[{value,label}],
 * placeholder, error, disabled, searchable, style }. onChange still receives
 * an event-like { target: { value } }, so useForm / field() keep working.
 */
import { forwardRef } from 'react';
import MuiSelect from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import OutlinedInput from '@mui/material/OutlinedInput';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { ChevronDown } from 'lucide-react';

const Chevron = (props) => <ChevronDown size={16} {...props} style={{ color: '#9A9A9A', right: 10, ...(props.style || {}) }} />;

const Select = forwardRef(function Select({
  error, options = [], placeholder, style, onChange, onBlur, value,
  searchable: searchableProp, disabled, autoFocus, className, id, ...rest
}, ref) {
  const searchable = searchableProp ?? options.length > 6;
  const selected = options.find((o) => String(o.value) === String(value ?? '')) || null;
  const emit = (v) => onChange?.({ target: { value: v } });
  const blur = () => onBlur?.({ target: { value } });

  if (searchable) {
    return (
      <div style={style} className={className}>
        <Autocomplete
          ref={ref}
          id={id}
          size="small"
          options={options}
          value={selected}
          disabled={disabled}
          disableClearable
          autoHighlight
          openOnFocus
          popupIcon={<ChevronDown size={16} />}
          getOptionLabel={(o) => (o ? String(o.label ?? '') : '')}
          isOptionEqualToValue={(o, v) => String(o.value) === String(v.value)}
          getOptionKey={(o) => String(o.value)}
          noOptionsText="No options found"
          onChange={(_e, opt) => emit(opt ? opt.value : '')}
          onBlur={blur}
          renderInput={(params) => (
            <TextField
              {...params}
              autoFocus={autoFocus}
              placeholder={selected ? undefined : (placeholder || 'Select...')}
              error={!!error}
              {...rest}
            />
          )}
        />
      </div>
    );
  }

  return (
    <div style={style} className={className}>
      <MuiSelect
        ref={ref}
        id={id}
        fullWidth
        size="small"
        displayEmpty
        value={selected ? selected.value : ''}
        disabled={disabled}
        autoFocus={autoFocus}
        error={!!error}
        onChange={(e) => emit(e.target.value)}
        onClose={blur}
        IconComponent={Chevron}
        input={<OutlinedInput />}
        renderValue={() => (selected
          ? selected.label
          : <span style={{ color: '#9A9A9A', fontWeight: 500 }}>{placeholder || 'Select...'}</span>)}
        MenuProps={{ slotProps: { paper: { style: { maxHeight: 300 } } } }}
        {...rest}
      >
        {options.map((o) => (
          <MenuItem key={String(o.value)} value={o.value}>{o.label}</MenuItem>
        ))}
      </MuiSelect>
    </div>
  );
});

export default Select;
