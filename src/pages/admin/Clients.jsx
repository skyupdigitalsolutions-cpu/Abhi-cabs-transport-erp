/**
 * Clients page — alias of Customers page.
 * The sidebar shows "Clients" but it maps to the same /admin/customers data.
 * Redirects to /admin/customers to avoid duplicating code.
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Clients() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/admin/customers', { replace: true }); }, [navigate]);
  return null;
}
