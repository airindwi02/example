/* eslint-disable @typescript-eslint/no-require-imports -- Standalone disposable integration-test harness. */
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { spawnSync } = require('node:child_process');
const { randomBytes } = require('node:crypto');
const assert = require('node:assert/strict');
const ts = require('typescript');
const { Client } = require('pg');

// Never reads .env or accepts a supplied database URL. All writes target a container
// created by this invocation, with no mounts and a random loopback-only port.
function docker(args, env = process.env) {
  const r = spawnSync('docker', args, { encoding: 'utf8', env, windowsHide: true, timeout: 120000 });
  if (r.error || r.status !== 0) throw new Error('Disposable Docker operation failed; sensitive diagnostics withheld.');
  return r.stdout.trim();
}
const root = path.resolve(__dirname, '..');
function loader() {
  const cache = new Map(), jar = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (cache.has(file)) return cache.get(file).exports;
    const m = new Module(file, module); m.filename = file; m.paths = Module._nodeModulePaths(path.dirname(file)); cache.set(file, m);
    const original = m.require.bind(m);
    m.require = id => {
      if (id === 'server-only') return {};
      if (id === 'next/headers') return { headers: async () => new Headers(), cookies: async () => ({ get: k => jar.get(k), set: (k, value, options) => jar.set(k, { value, options }), delete: k => jar.delete(k) }) };
      if (id === 'next/cache') return { revalidatePath() {} };
      if (id === 'next/navigation') return { redirect(url) { throw new Error(`REDIRECT:${url}`); } };
      if (id.startsWith('.')) { const p = path.resolve(path.dirname(file), id); if (fs.existsSync(p + '.ts')) return load(p + '.ts'); }
      return original(id);
    };
    const source = fs.readFileSync(file, 'utf8').replaceAll('import.meta.url', JSON.stringify(require('node:url').pathToFileURL(file).href));
    m._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
    return m.exports;
  }
  return { load, jar };
}
const data = fields => { const f = new FormData(); for (const [k,v] of Object.entries(fields)) f.set(k,v); return f; };
let container, client, prisma;
let phase = 'container startup';
async function main() {
  const secret = randomBytes(32).toString('hex');
  container = docker(['run', '--detach', '--name', `alana-auth-test-${randomBytes(6).toString('hex')}`, '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_PASSWORD', '--env', 'POSTGRES_DB=alana_auth_test', 'postgres:17-alpine'], { ...process.env, POSTGRES_PASSWORD: secret });
  if (!/^[a-f0-9]{64}$/.test(container)) throw new Error('Unexpected container identifier.');
  phase = 'loopback test port';
  let port = 0;
  for (let attempt = 0; attempt < 20 && !port; attempt++) {
    try { port = Number(docker(['port', container, '5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/)?.[1]); } catch { /* Wait for Docker port allocation. */ }
    if (!port) await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!port) {
    console.log('Disposable container state: ' + docker(['inspect', '--format', '{{.State.Status}}', container]));
    console.log('Disposable port bindings: ' + docker(['inspect', '--format', '{{json .NetworkSettings.Ports}}', container]));
    const logs = spawnSync('docker', ['logs', container], { encoding: 'utf8', windowsHide: true });
    const output = String(logs.stdout) + String(logs.stderr);
    console.log(JSON.stringify({ missingPassword: /superuser password is not specified/i.test(output), permissionDenied: /permission denied/i.test(output), incompatibleFiles: /incompatible|uninitialized|not empty/i.test(output), rootInitdb: /cannot be run as root/i.test(output), executableFormatError: /exec format error/i.test(output) }));
    throw new Error('Test port was not loopback-only.');
  }
  const url = new URL(`postgresql://postgres@127.0.0.1:${port}/alana_auth_test`); url.password = secret;
  for (let n = 0; n < 60; n++) {
    client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 1000 });
    try { await client.connect(); break; } catch { await client.end().catch(() => {}); client = null; await new Promise(r => setTimeout(r, 500)); }
  }
  if (!client) throw new Error('Isolated test database did not start.');
  phase = 'synthetic fixture';
  const ddl = [...fs.readFileSync(path.join(root, 'database.sql'), 'utf8').matchAll(/CREATE TABLE IF NOT EXISTS public\.[\s\S]*?;/g)].map(m => m[0]);
  assert.equal(ddl.length, 15);
  for (const statement of ddl) await client.query(statement);
  const constraintsBefore = (await client.query("SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY table_name,conname")).rows;
  const roles = ['Owner', 'Daily Worker', 'Kasir', 'Baker', 'Barista'];
  for (let i = 0; i < roles.length; i++) await client.query('INSERT INTO public.pengguna VALUES ($1,$2,$3,$4,$5)', [`test00000${i}`, `Synthetic ${i}`, `synthetic${i}`, 'invalid-test-seed', roles[i]]);
  const before = (await client.query('SELECT * FROM public.pengguna ORDER BY id_pengguna')).rows;
  const draft = fs.readFileSync(path.join(root, 'database/proposals/001-pengguna-auth.sql'), 'utf8');
  phase = 'migration approval guard';
  await assert.rejects(client.query(draft)); await client.query('ROLLBACK');
  assert.equal((await client.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='pengguna'")).rows[0].n, 5);
  await client.query("SET alana.auth_schema_approved = 'yes'");
  await assert.rejects(client.query(draft.replace('(status_akun, username);', '(nonexistent_test_column);')));
  await client.query('ROLLBACK');
  assert.equal((await client.query("SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='public' AND table_name='pengguna'")).rows[0].n, 5);
  phase = 'additive migration';
  await client.query(draft);
  assert.deepEqual((await client.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows, before);
  const constraintsAfter = (await client.query("SELECT conrelid::regclass::text AS table_name, conname, pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY table_name,conname")).rows;
  for (const previous of constraintsBefore) assert.ok(constraintsAfter.some(current => JSON.stringify(current) === JSON.stringify(previous)));
  assert.equal((await client.query("SELECT count(*)::int AS n FROM public.pengguna WHERE status_akun='PENDING' AND nomor_hp IS NULL AND email IS NULL AND diputuskan_oleh IS NULL AND diputuskan_pada IS NULL")).rows[0].n, 5);
  await assert.rejects(client.query("UPDATE public.pengguna SET status_akun='INVALID' WHERE id_pengguna='test000000'"), e => e.code === '23514');
  await assert.rejects(client.query("UPDATE public.pengguna SET diputuskan_oleh='missing' WHERE id_pengguna='test000000'"), e => e.code === '23503');
  await assert.rejects(client.query(draft)); await client.query('ROLLBACK');
  console.log('PASS: approval guard, rollback on DDL failure, additive migration across 15 reference tables, preservation of existing constraints and five synthetic accounts, pending defaults, status/FK constraints, repeat-run refusal.');
  phase = 'Prisma/server-action setup';
  await client.query("SET alana.payment_schema_approved='yes'");
  await client.query(fs.readFileSync(path.join(root,'database/proposals/003-kasir-payment-final.sql'),'utf8'));

  process.env.DATABASE_URL = url.toString();
  process.env.ALANA_DATABASE_AUTH = 'enabled';
  delete process.env.ALANA_SIGNUP; delete process.env.ALANA_APPROVALS;
  process.env.ALANA_SESSION_SECRET = randomBytes(40).toString('hex');
  process.env.NODE_ENV = 'test';
  const h = loader();
  prisma = h.load('lib/prisma.ts').prisma;
  const passwords = h.load('lib/password.ts');
  const actions = h.load('app/_auth/actions.ts');
  const ownerPassword = randomBytes(24).toString('hex');
  phase = 'synthetic Owner bootstrap/login';
  await client.query("UPDATE public.pengguna SET password_hash=$1,status_akun='ACTIVE' WHERE id_pengguna='test000000'", [await passwords.hashPassword(ownerPassword)]);
  assert.equal((await actions.loginAction(data({ username: 'synthetic0', password: ownerPassword, role: 'owner' }))).ok, true);
  assert.equal(h.jar.get('alana_session').options.httpOnly, true);
  assert.equal((await actions.signupAction(data({}))).ok, false);
  assert.equal((await actions.approvalAction(data({}))).ok, false);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.pengguna')).rows[0].n, 5);
  process.env.ALANA_APPROVALS = 'enabled'; process.env.ALANA_SIGNUP = 'enabled';
  const newPassword = randomBytes(24).toString('hex');
  const registration = { fullName: 'Synthetic Registration', username: 'newstaff', phone: '081234567890', email: 'test@example.invalid', password: newPassword, confirmPassword: newPassword, role: 'baker' };
  phase = 'signup and pending denial';
  assert.equal((await actions.signupAction(data(registration))).ok, true);
  assert.equal((await actions.signupAction(data(registration))).ok, false);
  const created = (await client.query("SELECT * FROM public.pengguna WHERE username='newstaff'")).rows[0];
  assert.equal(created.status_akun, 'PENDING'); assert.equal(created.nomor_hp, registration.phone); assert.equal(created.email, registration.email); assert.notEqual(created.password_hash, newPassword); assert.equal(await passwords.verifyPassword(created.password_hash, newPassword), true);
  assert.equal((await actions.loginAction(data({ username: 'newstaff', password: newPassword, role: 'baker' }))).ok, false);
  phase = 'Owner approval';
  assert.equal((await actions.approvalAction(data({ id: created.id_pengguna, role: 'Barista', decision: 'ACTIVE', ownerPassword }))).ok, true);
  const decision = (await client.query('SELECT * FROM public.pengguna WHERE id_pengguna=$1', [created.id_pengguna])).rows[0];
  assert.equal(decision.status_akun, 'ACTIVE'); assert.equal(decision.peran, 'Barista'); assert.equal(decision.diputuskan_oleh, 'test000000'); assert.ok(decision.diputuskan_pada);
  phase = 'role/password/login/logout';
  assert.equal((await actions.loginAction(data({ username: 'newstaff', password: newPassword, role: 'owner' }))).ok, false);
  assert.equal((await actions.loginAction(data({ username: 'newstaff', password: randomBytes(24).toString('hex'), role: 'baker' }))).ok, false);
  assert.equal((await actions.loginAction(data({ username: 'newstaff', password: newPassword, role: 'baker' }))).href, '/baker');
  await assert.rejects(actions.logoutAction(), /REDIRECT:\/login/); assert.equal(h.jar.size, 0);
  assert.deepEqual((await client.query('SELECT id_pengguna,nama_pengguna,username,peran FROM public.pengguna WHERE id_pengguna LIKE \'test%\' ORDER BY id_pengguna')).rows, before.map(({ id_pengguna,nama_pengguna,username,peran }) => ({ id_pengguna,nama_pengguna,username,peran })));
  console.log('PASS: real Prisma/server-action signup, contact persistence, Argon2id, duplicate rejection, pending denial, Owner approval, Barista mapping, incorrect role/password, login, HttpOnly session and logout.');
  console.log('NOTE: request headers/cookies are mocked; no browser or original-database write test was performed.');
}
main().catch(error => { console.error(JSON.stringify({ failedPhase: phase, error: error.name, code: error.code || null })); process.exitCode = 1; }).finally(async () => {
  if (prisma) await prisma.$disconnect();
  if (client) await client.end();
  if (container && /^[a-f0-9]{64}$/.test(container)) { try { docker(['rm', '--force', '--volumes', container]); console.log('Disposable test container and its anonymous volumes removed.'); } catch { console.error('Disposable container cleanup requires review.'); process.exitCode = 1; } }
});

