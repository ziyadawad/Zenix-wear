import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { customerWhatsapp, isEgPhone } from '@/lib/utils';
import { Card, PageHead, when } from '@/components/admin/ui';
import { DeleteAlertButton, MarkReadButton } from '@/components/admin/SmallActions';

export const dynamic = 'force-dynamic';

export default async function Inbox() {
  await requireAdmin();
  const messages = await db.query('SELECT * FROM messages ORDER BY is_read, created_at DESC LIMIT 100');
  const alerts = await db.query(`SELECT a.*, p.name_en, COALESCE(v.stock, 0) AS stock FROM stock_alerts a JOIN products p ON p.id = a.product_id LEFT JOIN product_variants v ON v.product_id = a.product_id AND v.color_id = a.color_id AND v.size = a.size ORDER BY stock DESC, a.created_at DESC LIMIT 100`);
  const subs = await db.query('SELECT email FROM newsletter ORDER BY created_at DESC LIMIT 2000');
  return (
    <>
      <PageHead title="Inbox" />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={`Contact messages (${messages.length})`}>
          {messages.length === 0 ? <p className="text-sm text-muted">No messages yet.</p> : (
            <ul className="divide-y divide-line">
              {messages.map((m) => (
                <li key={m.id} className={`py-3 text-sm ${m.is_read ? 'opacity-60' : ''}`}>
                  <p>{m.name} <span className="text-xs text-muted">· {when(new Date(m.created_at).toISOString())}</span></p>
                  <p className="text-xs text-muted">{m.phone}{m.phone && m.email ? ' · ' : ''}{m.email}</p>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{m.body}</p>
                  <div className="mt-1 flex gap-4">
                    {m.phone && <a href={customerWhatsapp(m.phone, `أهلًا ${m.name}، معاك ZENIX WEAR.`)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-xs underline">WhatsApp</a>}
                    {m.email && <a href={`mailto:${m.email}`} className="inline-flex min-h-11 items-center text-xs underline">Email</a>}
                    {!m.is_read && <MarkReadButton id={m.id} />}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Back-in-stock requests (${alerts.length})`}>
          {alerts.length === 0 ? <p className="text-sm text-muted">No requests yet.</p> : (
            <ul className="divide-y divide-line">
              {alerts.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">{a.name_en} <span className="text-xs capitalize text-muted">{a.color_id} / {a.size}</span>
                    <span className="block truncate text-xs text-muted">{isEgPhone(a.contact) ? <a className="underline" target="_blank" rel="noopener noreferrer" href={customerWhatsapp(a.contact, `أهلًا، ${a.name_en} (${a.size}) رجع متوفر تاني في ZENIX WEAR.`)}>{a.contact}</a> : <a className="underline" href={`mailto:${a.contact}`}>{a.contact}</a>}{a.stock > 0 ? <span className="text-success"> · back in stock, notify now</span> : ''}</span>
                  </span>
                  <DeleteAlertButton id={a.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title={`Newsletter subscribers (${subs.length})`} className="xl:col-span-2">
          {subs.length === 0 ? <p className="text-sm text-muted">No subscribers yet.</p> : <textarea readOnly aria-label="Subscriber emails" className="field min-h-[120px] text-sm" value={subs.map((s) => s.email).join(', ')} />}
        </Card>
      </div>
    </>
  );
}
