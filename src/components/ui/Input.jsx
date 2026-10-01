/**
 * Input — MUI <OutlinedInput>. Drop-in for the old native <input>:
 * accepts every native input attribute (type, min, max, step, maxLength,
 * pattern, inputMode…), `error`, `className`, `style`, and a forwarded ref
 * that points at the real <input> element.
 */
import { forwardRef } from 'react';
import OutlinedInput from '@mui/material/OutlinedInput';

// Props OutlinedInput understands itself; everything else goes to the <input>.
const ROOT = new Set([
  'value', 'defaultValue', 'onChange', 'onFocus', 'onBlur', 'onKeyDown', 'onKeyUp',
  'onClick', 'type', 'placeholder', 'disabled', 'name', 'id', 'autoFocus', 'readOnly',
  'required', 'autoComplete', 'startAdornment', 'endAdornment', 'multiline', 'rows',
  'minRows', 'maxRows', 'fullWidth', 'size', 'sx',
]);

const Input = forwardRef(function Input({ className, error, style, ...rest }, ref) {
  const rootProps = {};
  const htmlInput = {};
  for (const [k, v] of Object.entries(rest)) (ROOT.has(k) ? rootProps : htmlInput)[k] = v;

  // Text alignment / padding set by a page belong on the <input> itself.
  const { textAlign, paddingRight, paddingLeft, ...rootStyle } = style || {};
  const isDateOrTime = ['date', 'time', 'datetime-local', 'month', 'week'].includes(rest.type);

  return (
    <OutlinedInput
      fullWidth
      size="small"
      error={!!error}
      className={className}
      style={rootStyle}
      inputRef={ref}
      {...rootProps}
      slotProps={{
        input: {
          ...htmlInput,
          style: {
            ...(textAlign ? { textAlign } : {}),
            ...(paddingRight != null ? { paddingRight } : {}),
            ...(paddingLeft != null ? { paddingLeft } : {}),
            ...(isDateOrTime ? { colorScheme: 'light', cursor: 'pointer' } : {}),
          },
        },
      }}
    />
  );
});

export default Input;
