/* eslint-disable @typescript-eslint/no-require-imports -- Disposable PostgreSQL payment integration test. */
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, randomUUID } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { Client } = require('pg');

const root = path.resolve(__dirname, '..');
let container, client, prisma;
function docker(args, extra = {}) {
  const result = spawnSync('docker', args, { env: { ...process.env, ...extra }, encoding: 'utf8', windowsHide: true, timeout: 120000 });
  if (result.error || result.status !== 0) throw new Error('Disposable payment database operation failed; details withheld.');
  return result.stdout.trim();
}
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const name = `alana-payment-isolated-${randomBytes(6).toString('hex')}`;
  container = docker(['run', '--detach', '--name', name, '--publish', '127.0.0.1::5432', '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', '--env', 'POSTGRES_DB=alana_payment_test', 'postgres:17-alpine']);
  assert.match(container, /^[a-f0-9]{64}$/);
  const port = Number(docker(['port', container, '5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/)?.[1]);
  assert.ok(port, 'test database must bind only to loopback');
  const url = new URL(`postgresql://postgres@127.0.0.1:${port}/alana_payment_test`);
  for (let attempt = 0; attempt < 60; attempt++) {
    client = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 1000 });
    try { await client.connect(); break; } catch { await client.end().catch(() => {}); client = null; await wait(500); }
  }
  assert.ok(client, 'isolated PostgreSQL did not start');

  const ddl = [...fs.readFileSync(path.join(root, 'database.sql'), 'utf8').matchAll(/CREATE TABLE IF NOT EXISTS public\.[\s\S]*?;/g)].map(match => match[0]);
  assert.equal(ddl.length, 15);
  for (const statement of ddl) await client.query(statement);
  for (const [id, username, role] of [
    ['ownertst01', 'owner-test', 'Owner'],
    ['cashiertst', 'cashier-test', 'Kasir'],
    ['bakertest1', 'baker-test', 'Baker'],
    ['workertest', 'worker-test', 'Daily Worker'],
  ]) await client.query('INSERT INTO public.pengguna (id_pengguna,nama_pengguna,username,password_hash,peran) VALUES ($1,$2,$3,$4,$5)', [id, 'Isolated Test', username, 'synthetic-hash', role]);
  for (const [id, name] of [['PRD-01', 'Roti Tawar'], ['PRD-02', 'Croissant Butter'], ['PRD-03', 'Caffe Latte'], ['PRD-04', 'Brownies Cokelat']]) {
    await client.query('INSERT INTO public.barang (id_barang,nama_barang,satuan,jenis_barang,stok_minimum,stok_saat_ini) VALUES ($1,$2,$3,$4,1,5)', [id, name, 'pcs', 'Produk Hasil']);
  }
  await client.query("SET alana.auth_schema_approved='yes'");
  await client.query(fs.readFileSync(path.join(root, 'database/proposals/001-pengguna-auth.sql'), 'utf8'));
  await client.query("UPDATE public.pengguna SET status_akun='ACTIVE' WHERE username <> 'pending-test'");
  await client.query("SET alana.payment_schema_approved='yes'");
  await client.query(fs.readFileSync(path.join(root, 'database/proposals/003-kasir-payment-final.sql'), 'utf8'));
  await client.query("SET alana.payment_prices_approved='yes'");
  await client.query(fs.readFileSync(path.join(root, 'database/proposals/004-kasir-approved-prices.sql'), 'utf8'));

  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = url.toString();
  process.env.ALANA_ISOLATED_PAYMENT_TEST = 'enabled';
  process.env.ALANA_PAYMENT_TEST_DATABASE_URL = url.toString();
  process.env.ALANA_OWNER_PRICES = 'enabled';
  process.env.ALANA_CASH_PAYMENTS = 'enabled';
  process.env.ALANA_PAYMENT_FEE_POLICY = 'zero';
  ({ prisma } = require('../lib/prisma.ts'));
  const { setPrice, payCash } = require('../lib/payment-service.ts');
  const accounts = await prisma.pengguna.findMany({ select: { id_pengguna: true, username: true, peran: true, status_akun: true, password_hash: true } });
  const actor = username => accounts.find(account => account.username === username);
  const owner = actor('owner-test'), cashier = actor('cashier-test'), baker = actor('baker-test');
  const command = (id, price, qty = 1, received = '50000', key = randomUUID()) => ({ key, method: 'TUNAI', received, lines: [{ id, qty, price }] });

  await assert.rejects(setPrice(prisma, cashier, 'PRD-01', '19000'));
  await assert.rejects(payCash(prisma, owner, command('PRD-01', '18000.00')));
  await assert.rejects(payCash(prisma, baker, command('PRD-01', '18000.00')));
  await setPrice(prisma, owner, 'PRD-01', '19000');
  assert.equal((await client.query("SELECT harga_jual::text FROM public.barang WHERE id_barang='PRD-01'")).rows[0].harga_jual, '19000.00');

  const staleQuote = command('PRD-01', '18000.00');
  await assert.rejects(payCash(prisma, cashier, staleQuote), /Harga berubah/);
  await setPrice(prisma, owner, 'PRD-01', '18000');
  await client.query("UPDATE public.barang SET stok_saat_ini=1 WHERE id_barang='PRD-01'");
  const beforeInsufficient = await prisma.transaksi.count();
  await assert.rejects(payCash(prisma, cashier, command('PRD-01', '18000.00', 2)), /Stok produk tidak mencukupi/);
  assert.equal(await prisma.transaksi.count(), beforeInsufficient);
  await client.query("UPDATE public.barang SET stok_saat_ini=5 WHERE id_barang='PRD-01'");

  const intent = command('PRD-01', '18000.00', 2, '40000');
  const paid = await payCash(prisma, cashier, intent);
  assert.deepEqual({ total: paid.total, change: paid.change, replayed: paid.replayed }, { total: '36000.00', change: '4000.00', replayed: false });
  const replay = await payCash(prisma, cashier, intent);
  assert.equal(replay.replayed, true);
  assert.equal(await prisma.transaksi.count(), beforeInsufficient + 1);
  const saved = (await client.query('SELECT metode_pembayaran,total_bayar::text,pajak_layanan::text,uang_diterima::text,kembalian::text,waktu_bayar,kunci_idempotensi FROM public.transaksi WHERE id_transaksi=$1', [paid.id])).rows[0];
  assert.deepEqual({ method: saved.metode_pembayaran, total: saved.total_bayar, taxAndService: saved.pajak_layanan, received: saved.uang_diterima, change: saved.kembalian }, { method: 'TUNAI', total: '36000.00', taxAndService: '0.00', received: '40000.00', change: '4000.00' });
  assert.ok(saved.waktu_bayar instanceof Date);
  assert.ok(saved.kunci_idempotensi);
  assert.equal((await client.query("SELECT stok_saat_ini::text FROM public.barang WHERE id_barang='PRD-01'")).rows[0].stok_saat_ini, '3.00');

  const otherIntent = command('PRD-02', '22000.00', 1, '30000');
  const countBeforeRollback = await prisma.transaksi.count();
  const brokenDb = { $transaction: (fn, options) => prisma.$transaction(async tx => { await fn(tx); throw new Error('synthetic rollback'); }, options) };
  await assert.rejects(payCash(brokenDb, cashier, otherIntent), /synthetic rollback/);
  assert.equal(await prisma.transaksi.count(), countBeforeRollback);
  assert.equal((await client.query("SELECT stok_saat_ini::text FROM public.barang WHERE id_barang='PRD-02'")).rows[0].stok_saat_ini, '5.00');

  for (const method of ['QRIS', 'DEBIT']) await assert.rejects(payCash(prisma, cashier, { ...command('PRD-02', '22000.00'), method }));
  console.log(JSON.stringify({ isolatedDatabaseOnly: true, ownerPriceRoleGuard: true, cashierAndOtherRoleGuards: true, stalePriceRejected: true, insufficientStockRejectedWithoutWrite: true, cashTotalsAndChangeCorrect: true, zeroTaxAndServiceStored: true, idempotencyReplayNoDuplicate: true, transactionRollbackRestoredStockAndRows: true, qrisAndDebitRejected: true }));
}

main().catch(error => {
  console.error(JSON.stringify({ isolatedPaymentTestPassed: false, error: error.name || 'test failed', code: error.code || null, sensitiveDetailsWithheld: true }));
  process.exitCode = 1;
}).finally(async () => {
  if (prisma) await prisma.$disconnect().catch(() => {});
  if (client) await client.end().catch(() => {});
  if (container && /^[a-f0-9]{64}$/.test(container)) {
    try { docker(['rm', '--force', '--volumes', container]); }
    catch { console.error('Disposable payment test container cleanup failed.'); process.exitCode = 1; }
  }
});
