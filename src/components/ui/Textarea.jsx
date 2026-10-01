/** Textarea — MUI multiline <OutlinedInput>, same props as the old <textarea>. */
import { forwardRef } from 'react';
import Input from './Input';

const Textarea = forwardRef(function Textarea({ rows = 4, ...rest }, ref) {
  return <Input ref={ref} multiline minRows={rows} {...rest} />;
});

export default Textarea;
