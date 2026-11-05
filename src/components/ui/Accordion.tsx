import { Plus } from 'lucide-react';

/** Native <details>: works with keyboard and screen readers, and needs no JavaScript. */
export function Accordion({ title, children, open }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details className="group border-b border-line" open={open}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 text-sm [&::-webkit-details-marker]:hidden">
        {title}
        <Plus size={16} strokeWidth={1.25} className="flex-none transition-transform duration-300 group-open:rotate-45" />
      </summary>
      {children}
    </details>
  );
}
