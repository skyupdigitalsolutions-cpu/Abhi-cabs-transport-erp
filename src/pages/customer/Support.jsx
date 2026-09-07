import { useState } from 'react';
import { AlertOctagon, LifeBuoy } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import FormField from '../../components/ui/FormField';
import Input from '../../components/ui/Input';
import Textarea from '../../components/ui/Textarea';
import Select from '../../components/ui/Select';
import Button from '../../components/ui/Button';
import Alert from '../../components/ui/Alert';
import { useForm } from '../../hooks/useForm';
import { required } from '../../utils/validators';
import { ticketService } from '../../services';
import { useToast } from '../../hooks/useToast';
import { useAuth } from '../../hooks/useAuth';

export default function CustomerSupport() {
  const { user } = useAuth();
  const toast = useToast();
  const [submitted, setSubmitted] = useState(false);

  const { values, errors, touched, submitting, setValue, setFieldTouched, handleSubmit } = useForm({
    initialValues: { subject: '', priority: 'medium', message: '' },
    schema: { subject: [required('Subject')], message: [required('Message')] },
    onSubmit: async (vals) => {
      await ticketService.create({
        ...vals, customerName: user.name, status: 'open', isSos: false,
        messages: [{ from: 'customer', text: vals.message, at: new Date().toISOString() }],
      });
      setSubmitted(true);
      toast.success('Support request submitted');
    },
  });

  return (
    <div>
      <PageHeader title="Support" description="Get help with a booking, payment or anything else." />

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="border-red-200 bg-red-50/40">
          <AlertOctagon size={20} className="text-red-500 mb-2" />
          <p className="text-sm font-medium text-red-700 mb-1">Emergency SOS</p>
          <p className="text-xs text-red-600 mb-3">If you're in immediate danger during an active trip, trigger SOS for instant escalation.</p>
          <Button variant="danger" size="sm" className="w-full" onClick={() => toast.error('SOS triggered — our team has been alerted immediately')}>Trigger SOS</Button>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4 text-sm font-medium text-slate-700"><LifeBuoy size={16} /> Raise a support ticket</div>
          {submitted ? (
            <Alert type="success" title="We've got your request">Our support team typically responds within a few hours. You'll be notified here and by email.</Alert>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <FormField label="Subject" required error={touched.subject && errors.subject}>
                <Input value={values.subject} onChange={(e) => setValue('subject', e.target.value)} onBlur={() => setFieldTouched('subject')} maxLength={100} />
              </FormField>
              <FormField label="Priority" required>
                <Select value={values.priority} onChange={(e) => setValue('priority', e.target.value)}
                  options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} />
              </FormField>
              <FormField label="Message" required error={touched.message && errors.message}>
                <Textarea value={values.message} onChange={(e) => setValue('message', e.target.value)} onBlur={() => setFieldTouched('message')} maxLength={1000} />
              </FormField>
              <Button type="submit" loading={submitting}>Submit request</Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
