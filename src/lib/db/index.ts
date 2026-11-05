import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { SCHEMA_SQL } from './schema';

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
export interface Queryable {
  query<T extends Row = Row>(sql: string, params?: unknown[]): Promise<T[]>;
}
interface Driver extends Queryable {
  tx<T>(fn: (tx: Queryable) => Promise<T>): Promise<T>;
  exec(sql: string): Promise<void>;
  close(): Promise<void>;
}

/** Production: any Postgres, e.g. Supabase via its transaction pooler. */
async function postgresDriver(url: string): Promise<Driver> {
  const { default: postgres } = await import('postgres');
  const sql = postgres(url, {
    prepare: false, max: Number(process.env.DATABASE_POOL_MAX || 5), idle_timeout: 20, connect_timeout: 15,
    // Callers pass JSON.stringify(...) with a ::jsonb cast, as the embedded driver expects.
    // By default this driver would encode that string a second time and store a JSON string, not an object.
    types: { jsonb: { to: 3802, from: [3802, 114], serialize: (v: unknown) => (typeof v === 'string' ? v : JSON.stringify(v)), parse: (v: string) => JSON.parse(v) } },
  });
  const wrap = (c: { unsafe: (q: string, p?: never[]) => PromiseLike<unknown> }): Queryable => ({
    query: async <T extends Row>(q: string, p: unknown[] = []) => [...((await c.unsafe(q, p as never[])) as T[])],
  });
  return {
    ...wrap(sql),
    tx: <T,>(fn: (tx: Queryable) => Promise<T>) => sql.begin((t) => fn(wrap(t as never))) as Promise<T>,
    exec: async (q) => { await sql.unsafe(q); },
    close: () => sql.end(),
  };
}

/** Local: embedded Postgres in .data/, so the site runs with zero setup. Single process only. */
async function pgliteDriver(): Promise<Driver> {
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = path.join(process.cwd(), '.data', 'pglite');
  await mkdir(dir, { recursive: true });
  const pg = await PGlite.create(dir);
  return {
    query: async <T extends Row>(q: string, p: unknown[] = []) => (await pg.query<T>(q, p as never[])).rows,
    tx: <T,>(fn: (tx: Queryable) => Promise<T>) =>
      pg.transaction((t) => fn({ query: async <R extends Row>(q: string, p: unknown[] = []) => (await t.query<R>(q, p as never[])).rows })) as Promise<T>,
    exec: async (q) => { await pg.exec(q); },
    close: () => pg.close(),
  };
}

const store = globalThis as unknown as { __zenixDb?: Promise<Driver> };

async function init(): Promise<Driver> {
  const url = process.env.DATABASE_URL;
  if (url) return postgresDriver(url);
  if (process.env.VERCEL) throw new Error('DATABASE_URL is not set. The embedded database cannot run on Vercel.');
  const driver = await pgliteDriver();
  await driver.exec(SCHEMA_SQL);
  const { seedIfEmpty } = await import('./seed');
  await seedIfEmpty(driver);
  return driver;
}

function driver(): Promise<Driver> {
  store.__zenixDb ??= init().catch((e) => {
    store.__zenixDb = undefined;
    throw e;
  });
  return store.__zenixDb;
}

export const db = {
  query: async <T extends Row = Row>(q: string, params: unknown[] = []) => (await driver()).query<T>(q, params),
  /** Inside fn use only the `tx` argument: the embedded DB has one connection, so db.query would deadlock. */
  tx: async <T,>(fn: (tx: Queryable) => Promise<T>) => (await driver()).tx(fn),
};
export const openDriver = init;
export const newId = () => crypto.randomUUID();
