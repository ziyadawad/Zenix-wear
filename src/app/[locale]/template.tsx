'use client';
import { useEffect } from 'react';

let firstRender = true;

export default function Template({ children }: { children: React.ReactNode }) {
  const animate = !firstRender;
  useEffect(() => { firstRender = false; }, []);
  return <div className={animate ? 'page-in' : undefined}>{children}</div>;
}
