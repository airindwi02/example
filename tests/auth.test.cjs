/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS module harness replaces server boundaries in memory. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { randomBytes } = require('node:crypto');

// Transpile in memory so tests can replace server boundaries without touching a DB.
function harness(overrides = {}) {
  const cache = new Map(), cookieJar = new Map();
  const root = path.resolve(__dirname, '..');
  const cookieStore = { get: k => cookieJar.get(k), set: (k, value, options) => cookieJar.set(k, { value, options }), delete: k => cookieJar.delete(k) };
  function load(file) {
    file = path.resolve(root, file);
    const key = path.relative(root, file).replaceAll('\\', '/').replace(/\.tsx?$/, '');
    if (Object.hasOwn(overrides, key)) return overrides[key];
    if (key === 'lib/prisma') throw new Error('Database access is forbidden in unit tests');
    if (cache.has(file)) return cache.get(file).exports;
    const m = new Module(file, module); m.filename = file; m.paths = Module._nodeModulePaths(path.dirname(file)); cache.set(file, m);
    const original = m.require.bind(m);
    m.require = id => {
      if (Object.hasOwn(overrides, id)) return overrides[id];
      if (id === 'server-only') return {};
      if (id === 'next/headers') return { cookies: async () => cookieStore, headers: async () => new Headers() };
      if (id === 'next/cache') return { revalidatePath() {} };
      if (id === 'next/navigation') return { redirect(href) { throw new Error(`REDIRECT:${href}`); } };
      if (id.startsWith('.')) { const p = path.resolve(path.dirname(file), id); if (fs.existsSync(p + '.ts')) return load(p + '.ts'); }
      return original(id);
    };
    const source = fs.readFileSync(file, 'utf8');
    m._compile(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, file);
    return m.exports;
  }
  return { load, cookieJar };
}
const form = fields => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) f.set(k, v); return f; };

test('Argon2id: random salt, correct/wrong password, malformed and seed values', async () => {
  const p = harness().load('lib/password.ts');
  const password = randomBytes(24).toString('hex');
  const a = await p.hashPassword(password), b = await p.hashPassword(password);
  assert.ok(a.startsWith('$argon2id$')); assert.notEqual(a, b);
  assert.equal(await p.verifyPassword(a, password), true);
  assert.equal(await p.verifyPassword(a, randomBytes(24).toString('hex')), false);
  assert.equal(await p.verifyPassword('invalid-seed', password), false);
  assert.equal(await p.verifyPassword('$argon2id$broken', password), false);
});

test('policy rejects pending/rejected and cross-role access; production roles share baker', () => {
  const p = harness().load('lib/auth-policy.ts');
  for (const [role, route] of Object.entries(p.dashboards)) {
    assert.equal(p.canEnter({ peran: role, status_akun: 'ACTIVE' }, route), true);
    for (const status of ['PENDING', 'REJECTED']) assert.equal(p.canEnter({ peran: role, status_akun: status }, route), false);
    if (route !== '/owner') assert.equal(p.canEnter({ peran: role, status_akun: 'ACTIVE' }, '/owner'), false);
  }
  assert.equal(p.matchesRole('Barista', 'baker'), true);
  assert.equal(p.matchesRole('Owner', 'baker'), false);
  assert.equal(p.isRole('__proto__'), false);
  assert.equal(p.requestedRole('__proto__'), null);
  assert.equal(p.requestedRole('constructor'), null);
});

test('server validation covers fields and password confirmation', () => {
  const p = harness().load('lib/auth-policy.ts');
  const good = { fullName: 'Test User', username: 'test-user', phone: '081234567890', email: '', password: randomBytes(16).toString('hex'), role: 'baker' };
  good.confirmPassword = good.password;
  assert.deepEqual(p.validateSignup(good), {});
  for (const [key, value] of Object.entries({ fullName: '', username: 'bad space', phone: '1', email: 'invalid', password: 'x', confirmPassword: '', role: 'administrator' })) assert.ok(p.validateSignup({ ...good, [key]: value })[key]);
});

test('encrypted session has cookie protections, rejects tampering/expiry and logout deletes it', async () => {
  process.env.ALANA_SESSION_SECRET = randomBytes(40).toString('hex');
  const h = harness(), s = h.load('lib/session.ts');
  await s.createSession('test-user', 'not-a-real-hash');
  const cookie = h.cookieJar.get('alana_session');
  assert.equal(cookie.options.httpOnly, true); assert.equal(cookie.options.sameSite, 'lax'); assert.equal(cookie.options.path, '/');
  assert.equal(cookie.value.includes('test-user'), false);
  assert.equal((await s.readSession()).userId, 'test-user');
  h.cookieJar.set('alana_session', { value: 'tampered' }); assert.equal(await s.readSession(), null);
  const { sealData } = require('iron-session');
  h.cookieJar.set('alana_session', { value: await sealData({ userId: 'x', credentialVersion: 'x', expires: Date.now() - 1 }, { password: process.env.ALANA_SESSION_SECRET, ttl: 3600 }) });
  assert.equal(await s.readSession(), null);
  await s.deleteSession(); assert.equal(h.cookieJar.size, 0);
});

test('disabled actions never reach a database and dashboard preview stays available', async () => {
  delete process.env.ALANA_DATABASE_AUTH;
  const h = harness({ 'lib/prisma': { prisma: new Proxy({}, { get() { throw new Error('Unexpected database operation'); } }) } });
  const actions = h.load('app/_auth/actions.ts');
  assert.equal((await actions.loginAction(form({}))).ok, false);
  assert.equal((await actions.signupAction(form({}))).ok, false);
  await h.load('lib/auth.ts').requireDashboard('/owner');
});

test('login requires verified password, active status and matching database role', async () => {
  let account = { id_pengguna: 'test', peran: 'Owner', status_akun: 'ACTIVE', password_hash: 'fixture' }, sessions = 0;
  const actions = harness({
    'lib/auth': { requireReady: async () => {} },
    'lib/auth-repository': { findAccount: async () => account },
    'lib/password': { verifyPassword: async (_, p) => p === 'test-only-input', hashPassword: async () => 'unused' },
    'lib/session': { createSession: async () => { sessions++; } },
  }).load('app/_auth/actions.ts');
  const input = { username: 'test', password: 'test-only-input', role: 'owner' };
  assert.equal((await actions.loginAction(form(input))).href, '/owner');
  for (const status of ['PENDING', 'REJECTED']) { account.status_akun = status; assert.equal((await actions.loginAction(form(input))).ok, false); }
  account.status_akun = 'ACTIVE';
  assert.equal((await actions.loginAction(form({ ...input, role: 'kasir' }))).ok, false);
  assert.equal((await actions.loginAction(form({ ...input, password: 'wrong' }))).ok, false);
  account = null; assert.equal((await actions.loginAction(form(input))).ok, false);
  assert.equal(sessions, 1);
});

test('signup stores only hash, contact fields and PENDING intent; duplicate rejected', async () => {
  let duplicate = false, created;
  const actions = harness({
    'lib/auth-config': { signupEnabled: () => true, approvalsEnabled: () => true, localStaffSignupConfigured: () => false },
    'lib/auth': { requireReady: async () => {} },
    'lib/auth-repository': { findAccount: async () => duplicate ? {} : null, createPending: async input => { created = input; } },
    'lib/password': { hashPassword: async () => 'encoded-test-fixture' },
  }).load('app/_auth/actions.ts');
  const password = randomBytes(16).toString('hex');
  const input = { fullName: 'Test User', username: 'test-user', phone: '081234567890', email: 'test@example.invalid', password, confirmPassword: password, role: 'kasir' };
  assert.equal((await actions.signupAction(form(input))).ok, true);
  assert.equal(created.role, 'Kasir'); assert.equal(created.id.length, 10); assert.equal(created.phone, input.phone); assert.equal(created.email, input.email); assert.equal(created.hash, 'encoded-test-fixture'); assert.equal(Object.hasOwn(created, 'password'), false);
  duplicate = true; assert.equal((await actions.signupAction(form(input))).ok, false);
});

test('approval rejects staff, self-approval and wrong reauthentication', async () => {
  let actor = { id_pengguna: 'owner', peran: 'Owner', status_akun: 'ACTIVE', password_hash: 'fixture' }, writes = 0;
  const actions = harness({
    'lib/auth-config': { signupEnabled: () => true, approvalsEnabled: () => true, localStaffSignupConfigured: () => false },
    'lib/auth': { authenticatedAccount: async () => actor },
    'lib/auth-repository': { decideAccount: async () => { writes++; } },
    'lib/password': { verifyPassword: async (_, password) => password === 'local-test-input' },
  }).load('app/_auth/actions.ts');
  const input = { id: 'new-owner', role: 'Owner', decision: 'ACTIVE', ownerPassword: 'local-test-input' };
  assert.equal((await actions.approvalAction(form(input))).ok, true);
  assert.equal((await actions.approvalAction(form({ ...input, id: 'owner' }))).ok, false);
  assert.equal((await actions.approvalAction(form({ ...input, ownerPassword: 'wrong' }))).ok, false);
  actor.peran = 'Kasir'; assert.equal((await actions.approvalAction(form(input))).ok, false);
  assert.equal(writes, 1);
});

test('repository inserts PENDING and rechecks Owner/status inside approval transaction', async () => {
  const writes = []; let actorRole = 'Owner', targetStatus = 'PENDING';
  const tx = { $queryRaw: async strings => strings.join('').includes('password_hash') ? [{ peran: actorRole, status_akun: 'ACTIVE', password_hash: 'fixture' }] : [{ peran: 'Owner', status_akun: targetStatus }], $executeRaw: async (strings, ...values) => { writes.push({ sql: strings.join('?'), values }); return 1; } };
  const repo = harness({ 'lib/prisma': { prisma: { ...tx, $transaction: async fn => fn(tx) } } }).load('lib/auth-repository.ts');
  await repo.createPending({ id: 'x', name: 'x', username: 'x', hash: 'encoded', role: 'Owner', phone: 'x', email: null });
  assert.ok(writes[0].sql.includes("'PENDING'"));
  await repo.decideAccount('owner', 'fixture', 'new', 'ACTIVE', 'Owner');
  actorRole = 'Kasir'; await assert.rejects(repo.decideAccount('owner', 'fixture', 'new', 'ACTIVE', 'Owner'));
  actorRole = 'Owner'; targetStatus = 'ACTIVE'; await assert.rejects(repo.decideAccount('owner', 'fixture', 'new', 'ACTIVE', 'Owner'));
  assert.equal(writes.length, 2);
});

test('server guard rejects no session, non-active account, changed password and cross-role', async () => {
  process.env.ALANA_DATABASE_AUTH = 'enabled';
  let session = null, account = { id_pengguna: 'x', peran: 'Kasir', status_akun: 'ACTIVE', password_hash: 'encoded' };
  const auth = harness({
    'lib/auth-repository': { assertAuthSchema: async () => {}, accountById: async () => account },
    'lib/session': { readSession: async () => session, credentialVersion: () => 'version' },
  }).load('lib/auth.ts');
  await assert.rejects(auth.requireDashboard('/owner'), /REDIRECT:\/login/);
  session = { userId: 'x', credentialVersion: 'version' };
  await auth.requireDashboard('/kasir');
  await assert.rejects(auth.requireDashboard('/owner'), /REDIRECT:\/kasir/);
  account.status_akun = 'PENDING'; assert.equal(await auth.authenticatedAccount(), null);
  account.status_akun = 'ACTIVE'; session.credentialVersion = 'outdated'; assert.equal(await auth.authenticatedAccount(), null);
  delete process.env.ALANA_DATABASE_AUTH;
});

test('request guard denies direct access and cross-role requests when enabled', async () => {
  process.env.ALANA_DATABASE_AUTH = 'enabled';
  let session = null, account = { peran: 'Kasir', status_akun: 'ACTIVE', password_hash: 'encoded' };
  const proxy = harness({
    'next/server': { NextResponse: { next: () => ({ status: 200, headers: new Headers() }), redirect: url => ({ status: 307, location: String(url) }) } },
    'lib/auth': { requireReady: async () => {} },
    'lib/auth-repository': { accountById: async () => account },
    'lib/session': { decodeSession: async () => session, credentialVersion: () => 'current' },
  }).load('proxy.ts').proxy;
  const request = { url: 'https://example.invalid/owner', nextUrl: { pathname: '/owner' }, cookies: { get: () => undefined } };
  request.nextUrl.pathname = '/owner/logo.png'; assert.equal((await proxy(request)).status, 200);
  request.nextUrl.pathname = '/owner';
  assert.ok((await proxy(request)).location.endsWith('/login'));
  session = { userId: 'x', credentialVersion: 'current' };
  assert.ok((await proxy(request)).location.endsWith('/kasir'));
  request.nextUrl.pathname = '/kasir'; assert.equal((await proxy(request)).status, 200);
  account.status_akun = 'REJECTED'; assert.ok((await proxy(request)).location.endsWith('/login'));
  delete process.env.ALANA_DATABASE_AUTH;
});

test('readiness refuses missing columns without issuing a write', async () => {
  let queryCount = 0;
  const repo = harness({ 'lib/prisma': { prisma: { $queryRaw: async () => { queryCount++; return [{ column_name: 'username' }]; } } } }).load('lib/auth-repository.ts');
  await assert.rejects(repo.assertAuthSchema(), /not been approved/);
  assert.equal(queryCount, 1);
});

test('Login, Sign Up and approval activation are independent and default closed', () => {
  const config = harness().load('lib/auth-config.ts');
  delete process.env.ALANA_DATABASE_AUTH; delete process.env.ALANA_SIGNUP; delete process.env.ALANA_APPROVALS;
  assert.equal(config.databaseAuthEnabled(), false); assert.equal(config.signupEnabled(), false); assert.equal(config.approvalsEnabled(), false);
  process.env.ALANA_DATABASE_AUTH = 'enabled';
  assert.equal(config.databaseAuthEnabled(), true); assert.equal(config.signupEnabled(), false); assert.equal(config.approvalsEnabled(), false);
  process.env.ALANA_APPROVALS = 'enabled'; assert.equal(config.approvalsEnabled(), true); assert.equal(config.signupEnabled(), false);
  process.env.ALANA_SIGNUP = 'enabled'; assert.equal(config.signupEnabled(), true);
  delete process.env.ALANA_DATABASE_AUTH; assert.equal(config.signupEnabled(), false); assert.equal(config.approvalsEnabled(), false);
  delete process.env.ALANA_SIGNUP; delete process.env.ALANA_APPROVALS;
});

test('Owner-only bootstrap preserves staff and refuses overwrite or identity changes', () => {
  const { selectBootstrapAccounts } = harness().load('lib/bootstrap-policy.ts');
  const rows = ['Owner','Daily Worker','Kasir','Baker','Barista'].map((peran,i) => ({ id_pengguna: String(i), nama_pengguna: 'Synthetic', username: 'synthetic'+i, password_hash: 'synthetic-seed', peran }));
  const expected = rows.map(r => [r.id_pengguna,r.nama_pengguna,r.username,r.password_hash,r.peran]);
  assert.deepEqual(selectBootstrapAccounts(rows,expected,'--owner-only').map(r=>r.peran),['Owner']);
  rows[0].password_hash = '$argon2id$synthetic-initialized';
  assert.throws(()=>selectBootstrapAccounts(rows,expected,'--owner-only'));
  assert.equal(selectBootstrapAccounts(rows,expected,'--staff-only').length,4);
  rows[1].username = 'changed'; assert.throws(()=>selectBootstrapAccounts(rows,expected,'--staff-only'));
  assert.throws(()=>selectBootstrapAccounts(rows,expected,'--all'));
});

test('bootstrap strength rejects trivial inputs and accepts random passwords or long passphrases', () => {
  const { strongBootstrapPassword } = harness().load('lib/bootstrap-policy.ts');
  assert.equal(strongBootstrapPassword('aaaaaaaaaaaa', 'synthetic'), false);
  assert.equal(strongBootstrapPassword('Password123456!', 'synthetic'), false);
  assert.equal(strongBootstrapPassword('synthetic-Random123!', 'synthetic'), false);
  assert.equal(strongBootstrapPassword(randomBytes(24).toString('base64'), 'synthetic'), true);
  assert.equal(strongBootstrapPassword('four unrelated fictional words', 'synthetic'), true);
});

test('direct staff registration requires development and loopback Host with matching Origin', async () => {
  const previous=process.env.NODE_ENV;
  process.env.ALANA_DATABASE_AUTH='enabled';process.env.ALANA_LOCAL_STAFF_SIGNUP='enabled';
  const config=harness().load('lib/auth-config.ts');
  process.env.NODE_ENV='production';assert.equal(config.localStaffSignupConfigured(),false);
  process.env.NODE_ENV='development';assert.equal(config.localStaffSignupConfigured(),true);
  let values=new Headers({host:'localhost:3000',origin:'http://localhost:3000'});
  const local=harness({'next/headers':{headers:async()=>values}}).load('lib/auth-local.ts');
  assert.equal(await local.localStaffSignupRequest(),true);
  values=new Headers({host:'example.com',origin:'https://example.com'});assert.equal(await local.localStaffSignupRequest(),false);
  values=new Headers({host:'localhost:3000',origin:'https://attacker.invalid'});assert.equal(await local.localStaffSignupRequest(),false);
  assert.equal(local.isLoopbackHost('localhost@attacker.invalid'),false);
  if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
  delete process.env.ALANA_DATABASE_AUTH;delete process.env.ALANA_LOCAL_STAFF_SIGNUP;
});

test('Owner role selection without administrator setup or approval path never creates an account', async () => {
  let writes=0;
  const actions=harness({
    'lib/auth-config':{signupEnabled:()=>true,approvalsEnabled:()=>false,localStaffSignupConfigured:()=>true,ownerSetupConfigured:()=>false,ownerRequestsConfigured:()=>false},
    'lib/auth':{requireReady:async()=>{}},
    'lib/auth-repository':{createPending:async()=>{writes++;},createLocalStaffActive:async()=>{writes++;},requestAdditionalOwner:async()=>{writes++;}},
  }).load('app/_auth/actions.ts');
  const password=randomBytes(24).toString('base64');
  const result=await actions.signupAction(form({fullName:'Synthetic Owner',username:'synthetic_owner',phone:'081234567890',email:'',password,confirmPassword:password,role:'owner',ownerSetupCode:''}));
  assert.equal(result.ok,false);assert.equal(writes,0);
});

test('Owner bootstrap is disabled in production even when its flag is set',()=>{
  const previous=process.env.NODE_ENV;
  process.env.ALANA_DATABASE_AUTH='enabled';process.env.ALANA_OWNER_BOOTSTRAP='enabled';process.env.NODE_ENV='production';
  const config=harness().load('lib/auth-config.ts');assert.equal(config.ownerSetupConfigured(),false);
  process.env.NODE_ENV='development';assert.equal(config.ownerSetupConfigured(),true);
  if(previous===undefined)delete process.env.NODE_ENV;else process.env.NODE_ENV=previous;
  delete process.env.ALANA_DATABASE_AUTH;delete process.env.ALANA_OWNER_BOOTSTRAP;
});
