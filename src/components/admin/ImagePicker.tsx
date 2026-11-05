'use client';
import { useRef, useState } from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Plus, X } from 'lucide-react';
import { uploadImage } from '@/app/admin/actions';
import { compressImage } from '@/lib/client/image';

/** Multi-image field. Photos are shrunk on the phone first, so large camera files upload quickly. */
export function ImagePicker({ images, onChange, max = 12, label = 'Add photos' }: { images: string[]; onChange: (v: string[]) => void; max?: number; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(images);
  latest.current = images;

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    const list = [...files].slice(0, max - images.length);
    setBusy(list.length);
    for (const f of list) {
      const fd = new FormData();
      fd.set('file', await compressImage(f));
      try {
        const r = await uploadImage(fd);
        if (r.url) { latest.current = [...latest.current, r.url]; onChange(latest.current); }
        else setError(r.error ?? 'Upload failed.');
      } catch { setError('Upload failed. Check your connection.'); }
      setBusy((b) => b - 1);
    }
    if (input.current) input.current.value = '';
  };
  const move = (i: number, d: number) => {
    const n = [...images];
    const j = i + d;
    if (j < 0 || j >= n.length) return;
    [n[i], n[j]] = [n[j], n[i]];
    onChange(n);
  };
  return (
    <div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
        {images.map((src, i) => (
          <div key={src + i} className="relative aspect-[4/5] overflow-hidden bg-raised">
            <Image src={src} alt={`Photo ${i + 1}`} fill sizes="160px" quality={70} className="object-cover" />
            {i === 0 && max > 1 && <span className="absolute start-1 top-1 bg-black/80 px-1 text-[9px]">MAIN</span>}
            <button type="button" aria-label="Remove photo" onClick={() => onChange(images.filter((_, x) => x !== i))} className="absolute end-0 top-0 flex size-9 items-center justify-center bg-black/60"><X size={15} /></button>
            {max > 1 && (
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/60">
                <button type="button" aria-label="Move earlier" onClick={() => move(i, -1)} className="flex h-9 flex-1 items-center justify-center disabled:opacity-30" disabled={i === 0}><ArrowLeft size={14} /></button>
                <button type="button" aria-label="Move later" onClick={() => move(i, 1)} className="flex h-9 flex-1 items-center justify-center disabled:opacity-30" disabled={i === images.length - 1}><ArrowRight size={14} /></button>
              </div>
            )}
          </div>
        ))}
        {Array.from({ length: busy }).map((_, i) => <div key={i} className="skeleton aspect-[4/5]" />)}
        {images.length + busy < max && (
          <label className="flex aspect-[4/5] cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-line-strong text-center text-[11px] text-muted hover:border-white hover:text-white">
            <Plus size={20} strokeWidth={1.25} />{label}
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple={max > 1} className="sr-only" onChange={(e) => add(e.target.files)} />
          </label>
        )}
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </div>
  );
}
