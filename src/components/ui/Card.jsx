/** Card — MUI <Card> (Ionic-style soft rounded panel). Same props: padded, className, children. */
import MuiCard from '@mui/material/Card';

export default function Card({ className, children, padded = true, style, sx, ...props }) {
  return (
    <MuiCard className={className} style={style} sx={[{ p: padded ? 2.5 : 0 }, ...(Array.isArray(sx) ? sx : [sx || {}])]} {...props}>
      {children}
    </MuiCard>
  );
}
