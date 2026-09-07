import PageHeader from '../../components/ui/PageHeader';
import CustomerBookingForm from '../../components/customer/CustomerBookingForm';

export default function BookTrip() {
  return (
    <div>
      <PageHeader title="Book a trip" description="Tell us what you're shipping and where it needs to go." />
      <CustomerBookingForm />
    </div>
  );
}
