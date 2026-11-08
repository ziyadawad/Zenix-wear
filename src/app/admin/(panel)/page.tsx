import { redirect } from 'next/navigation';

/** The dashboard is the home of the admin area. */
export default function AdminHome() {
  redirect('/dashboard');
}
