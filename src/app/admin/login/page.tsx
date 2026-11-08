import { redirect } from 'next/navigation';

/** One login for the dashboard and the admin area. */
export default function AdminLogin() {
  redirect('/dashboard/login');
}
