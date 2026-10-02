// Runs the real SQL files in an in-memory Postgres (PGlite) with Supabase stand-ins,
// so row-level security and the RPCs can be tested without a Supabase project.
import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = (p) => fileURLToPath(new URL(p, import.meta.url));

export async function boot(
  files = ['01_schema.sql', '02_schema_v2.sql', '03_seed.sql', '04_reservation_number.sql'],
) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(readFileSync(here('./prelude.sql'), 'utf8'));
  for (const f of files) {
    try {
      await db.exec(readFileSync(here(`../${f}`), 'utf8'));
      console.log('ok  ', f);
    } catch (e) {
      console.log('FAIL', f, '\n     ', e.message, e.position ? `(pos ${e.position})` : '');
      process.exit(1);
    }
  }
  return db;
}

// Run a statement as a signed-in user (row-level security applies).
export async function as(db, uid, sql, params) {
  await db.exec(
    `set role authenticated; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false)`,
  );
  try {
    return await db.query(sql, params);
  } finally {
    await db.exec('reset role');
  }
}
