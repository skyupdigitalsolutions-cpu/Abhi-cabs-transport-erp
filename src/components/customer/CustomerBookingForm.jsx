import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Package, ArrowRight } from 'lucide-react';
import Card from '../ui/Card';
import FormField from '../ui/FormField';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import Button from '../ui/Button';
import Alert from '../ui/Alert';
import { useForm } from '../../hooks/useForm';
import { required } from '../../utils/validators';
import { bookingService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';
import { BOOKING_STATUS } from '../../constants';
import { formatCurrency } from '../../utils/formatters';

const STEPS = ['Route & cargo', 'Review & confirm'];

export default function CustomerBookingForm() {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const { values, errors, touched, submitting, submitError, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { pickup: '', drop: '', cargoType: 'General', weightTon: 1, notes: '' },
    schema: { pickup: [required('Pickup location')], drop: [required('Drop location')] },
    onSubmit: async (vals) => {
      const fare = 800 + vals.weightTon * 350;
      const booking = await bookingService.create({
        ...vals, fare, customerId: user.id, customerName: user.name,
        status: BOOKING_STATUS.PENDING, scheduledAt: new Date().toISOString(),
      });
      toast.success('Booking created! We\u2019ll confirm shortly.');
      navigate(`/app/bookings/${booking.id}`);
    },
  });

  const estimatedFare = 800 + values.weightTon * 350;

  const goNext = () => {
    if (!values.pickup || !values.drop) {
      setFieldTouched('pickup'); setFieldTouched('drop');
      return;
    }
    setStep(1);
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-semibold shrink-0 ${i <= step ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}`}>{i + 1}</div>
            <span className={`text-sm ${i <= step ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>{s}</span>
            {i < STEPS.length - 1 && <div className="flex-1 h-px bg-slate-200" />}
          </div>
        ))}
      </div>

      {submitError && <Alert type="error" className="mb-4">{submitError}</Alert>}

      <Card>
        {step === 0 ? (
          <form onSubmit={(e) => { e.preventDefault(); goNext(); }} noValidate className="space-y-4">
            <FormField label="Pickup location" required error={touched.pickup && errors.pickup}>
              <Input icon={MapPin} value={values.pickup} onChange={(e) => setValue('pickup', e.target.value)} onBlur={() => setFieldTouched('pickup')} placeholder="Enter warehouse or address" maxLength={120} />
            </FormField>
            <FormField label="Drop location" required error={touched.drop && errors.drop}>
              <Input value={values.drop} onChange={(e) => setValue('drop', e.target.value)} onBlur={() => setFieldTouched('drop')} placeholder="Enter delivery address" maxLength={120} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Cargo type" required>
                <Select value={values.cargoType} onChange={(e) => setValue('cargoType', e.target.value)}
                  options={['General', 'Fragile', 'Perishable', 'Bulk', 'Documents'].map((t) => ({ value: t, label: t }))} />
              </FormField>
              <FormField label="Weight (tons)" required>
                <Select value={values.weightTon} onChange={(e) => setValue('weightTon', Number(e.target.value))}
                  options={[0.5, 1, 2, 3, 5].map((t) => ({ value: t, label: `${t} ton` }))} />
              </FormField>
            </div>
            <FormField label="Notes for driver" hint="Optional">
              <Textarea value={values.notes} onChange={(e) => setValue('notes', e.target.value)} maxLength={300} />
            </FormField>
            <Button type="submit" className="w-full" iconRight={ArrowRight}>Continue</Button>
          </form>
        ) : (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-slate-400 mb-1">Route</p>
              <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <span>{values.pickup}</span><ArrowRight size={14} className="text-slate-300 shrink-0" /><span>{values.drop}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Package size={15} className="text-slate-400" /> {values.cargoType} · {values.weightTon} ton
            </div>
            {values.notes && <p className="text-sm text-slate-500">Notes: {values.notes}</p>}
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm text-slate-500">Estimated fare</span>
              <span className="text-lg font-semibold text-slate-900">{formatCurrency(estimatedFare)}</span>
            </div>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setStep(0)}>Back</Button>
              <Button className="flex-1" onClick={handleSubmit} loading={submitting}>Confirm booking</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
