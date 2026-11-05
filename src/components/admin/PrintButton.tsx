'use client';
import { Printer } from 'lucide-react';

export function PrintButton() {
  return <button className="btn btn-primary !min-h-11" onClick={() => window.print()}><Printer size={16} strokeWidth={1.25} />Print</button>;
}
