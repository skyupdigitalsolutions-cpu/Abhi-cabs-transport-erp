import { cn } from '../../utils/cn';

export default function Card({ className, children, padded = true, ...props }) {
  return (
    <div
      className={cn('rounded-xl border', padded && 'p-5', className)}
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#E8E8E4',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
      {...props}
    >
      {children}
    </div>
  );
}
