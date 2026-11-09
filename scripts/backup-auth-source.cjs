/* eslint-disable @typescript-eslint/no-require-imports -- Explicit backup/restore verification utility. */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { randomBytes, createHash } = require('node:crypto');
const { Client } = require('pg');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const env = { ...require('dotenv').parse(fs.readFileSync(path.join(root, '.env'))), ...process.env };
const directory = process.env.ALANA_BACKUP_DIRECTORY;
let phase = 'preflight', source, target, container;
function docker(args, extra = {}) {
  const result = spawnSync('docker', args, { env: { ...process.env, ...extra }, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Backup tool failed; raw diagnostics withheld.');
  return result.stdout.trim();
}
const quote = value => '"' + value.replaceAll('"', '""') + '"';
async function inventory(client) {
  const tables = (await client.query("SELECT n.nspname AS schema_name,c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p') AND n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' ORDER BY 1,2")).rows;
  const columns = (await client.query("SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,character_maximum_length,numeric_precision,numeric_scale,is_nullable,column_default,datetime_precision FROM information_schema.columns WHERE table_schema NOT LIKE 'pg_%' AND table_schema <> 'information_schema' ORDER BY table_schema,table_name,ordinal_position")).rows;
  const constraints = (await client.query("SELECT n.nspname AS schema_name,c.conrelid::regclass::text AS table_name,c.conname,c.contype,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname <> 'information_schema' ORDER BY 1,2,3")).rows;
  const indexes = (await client.query("SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname NOT LIKE 'pg_%' AND schemaname <> 'information_schema' ORDER BY 1,2,3")).rows;
  const data = [];
  for (const table of tables) {
    const name = `${quote(table.schema_name)}.${quote(table.table_name)}`;
    const result = await client.query(`SELECT count(*)::text AS count, md5(coalesce(string_agg(digest, '' ORDER BY digest),'')) AS fingerprint FROM (SELECT md5(row_to_json(t)::text) AS digest FROM ${name} t) AS rows`);
    data.push({ ...table, ...result.rows[0] });
  }
  return { tables, columns, constraints, indexes, data };
}
function verifySchema(baseline) {
  assert.equal(baseline.tables.length, 15);
  const cols = baseline.columns.filter(c => c.table_schema === 'public' && c.table_name === 'pengguna');
  const expected = { id_pengguna: 10, nama_pengguna: 50, username: 20, password_hash: 255, peran: 20 };
  assert.equal(cols.length, 5);
  for (const c of cols) assert.ok(expected[c.column_name] === c.character_maximum_length && c.data_type === 'character varying' && c.is_nullable === 'NO' && c.column_default === null);
  assert.ok(baseline.constraints.some(c => c.conname === 'pk_pengguna' && c.contype === 'p'));
  assert.ok(baseline.constraints.some(c => c.conname === 'uq_pengguna_username' && c.contype === 'u'));
  assert.ok(!baseline.constraints.some(c => ['ck_pengguna_status_akun', 'fk_pengguna_diputuskan_oleh'].includes(c.conname)));
  assert.ok(!baseline.indexes.some(i => i.indexname === 'ix_pengguna_status_username'));
  assert.equal(baseline.data.find(t => t.schema_name === 'public' && t.table_name === 'pengguna').count, '5');
}
async function main() {
  if (!directory || !fs.statSync(directory).isDirectory()) throw new Error('An existing ACL-protected backup directory is required.');
  const resolved = path.resolve(directory);
  assert.ok(!resolved.toLowerCase().startsWith(root.toLowerCase() + path.sep) && resolved.toLowerCase() !== root.toLowerCase());
  const url = new URL(env.DATABASE_URL); url.searchParams.delete('schema');
  assert.ok(!/alana_auth_test|alana_restore_check/i.test(decodeURIComponent(url.pathname)));
  source = new Client({ connectionString: url.toString(), connectionTimeoutMillis: 10000 });
  await source.connect();
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const major = Math.floor(Number((await source.query("SHOW server_version_num")).rows[0].server_version_num) / 10000);
  assert.equal(major, 17);
  const before = await inventory(source); verifySchema(before);
  const accounts = (await source.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows;
  const block = fs.readFileSync(path.join(root,'database.sql'),'utf8').match(/INSERT INTO public\.pengguna\s*\([^;]*?VALUES([\s\S]*?);/i)?.[1] || '';
  const expected = [...block.matchAll(/\(([^()]*)\)/g)].map(m => [...m[1].matchAll(/'((?:''|[^'])*)'/g)].map(v => v[1].replaceAll("''","'")));
  assert.equal(accounts.length, 5);
  assert.ok(accounts.every(r => expected.some(t => t[0]===r.id_pengguna && t[1]===r.nama_pengguna && t[2]===r.username && t[3]===r.password_hash && t[4]===r.peran)));
  const snapshot = (await source.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
  const file = `alana-before-auth-${new Date().toISOString().replace(/[:.]/g,'-')}.dump`;
  const filename = path.join(resolved,file);
  assert.ok(!fs.existsSync(filename));
  const sourceEnvironment = {
    PGHOST: ['localhost','127.0.0.1','::1'].includes(url.hostname) ? 'host.docker.internal' : url.hostname,
    PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get('sslmode') || 'prefer', PGCONNECT_TIMEOUT: '10', PGOPTIONS: '-c default_transaction_read_only=on',
  };
  phase = 'custom pg_dump';
  docker(['run','--rm','--mount',`type=bind,source=${resolved},target=/backup`,...Object.keys(sourceEnvironment).flatMap(key=>['--env',key]),'postgres:17-alpine','pg_dump','--format=custom',`--snapshot=${snapshot}`,'--lock-wait-timeout=5s',`--file=/backup/${file}`],sourceEnvironment);
  await source.query('ROLLBACK');
  assert.ok(fs.statSync(filename).size > 5);
  const header = Buffer.alloc(5), fd = fs.openSync(filename,'r'); fs.readSync(fd,header,0,5,0); fs.closeSync(fd); assert.equal(header.toString(),'PGDMP');
  phase = 'archive readability';
  const toc = docker(['run','--rm','--network','none','--mount',`type=bind,source=${resolved},target=/backup,readonly`,'postgres:17-alpine','pg_restore','--list',`/backup/${file}`]);
  assert.ok(toc.includes('TABLE DATA public pengguna'));
  const sha256 = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
  console.log(JSON.stringify({ backupCreated: true, file: filename, bytes: fs.statSync(filename).size, sha256, archiveReadable: true }));
  phase = 'isolated restore startup';
  const secret = randomBytes(32).toString('hex');
  container = docker(['run','--detach','--name',`alana-restore-${randomBytes(6).toString('hex')}`,'--publish','127.0.0.1::5432','--mount',`type=bind,source=${resolved},target=/backup,readonly`,'--env','POSTGRES_PASSWORD','--env','POSTGRES_DB=alana_restore_check','postgres:17-alpine'],{POSTGRES_PASSWORD:secret});
  assert.match(container,/^[a-f0-9]{64}$/);
  const port = Number(docker(['port',container,'5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/)?.[1]); assert.ok(port);
  const targetUrl = new URL(`postgresql://postgres@127.0.0.1:${port}/alana_restore_check`); targetUrl.password = secret;
  assert.notEqual(targetUrl.toString(),url.toString());
  for (let attempt=0;attempt<60;attempt++) {
    target = new Client({ connectionString:targetUrl.toString(),connectionTimeoutMillis:1000 });
    try { await target.connect(); break; } catch { await target.end().catch(()=>{});target=null; await new Promise(r=>setTimeout(r,500)); }
  }
  if (!target) throw new Error('Restore target did not start.');
  assert.equal((await target.query("SELECT count(*)::int AS n FROM pg_tables WHERE schemaname='public'")).rows[0].n,0);
  phase = 'pg_restore on disposable target only';
  docker(['exec',container,'pg_restore','--exit-on-error','--single-transaction','--no-owner','--no-privileges','-U','postgres','-d','alana_restore_check',`/backup/${file}`]);
  phase = 'restore integrity comparison';
  await target.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const restored = await inventory(target);
  assert.deepEqual(restored,before);
  assert.deepEqual((await target.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows,accounts);
  await target.query('ROLLBACK');
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const after = await inventory(source); assert.deepEqual(after,before);
  assert.deepEqual((await source.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows,accounts);
  await source.query('ROLLBACK');
  const report = { verifiedAt:new Date().toISOString(),file,bytes:fs.statSync(filename).size,sha256,customArchive:true,archiveReadable:true,restoreVerified:true,tableCount:before.tables.length,rowCounts:before.data.map(({schema_name,table_name,count})=>({schema_name,table_name,count})),allTableDataMatched:true,columnsConstraintsIndexesMatched:true,initialAccountCount:5,initialAccountsExactlyMatched:true,sourceUnchanged:true,migrationSchemaPreflight:true,sourceAuthEnabled:env.ALANA_DATABASE_AUTH==='enabled',sourceSignupEnabled:env.ALANA_SIGNUP==='enabled',sourceApprovalsEnabled:env.ALANA_APPROVALS==='enabled',restoreOwnershipAndPrivilegesSkipped:true };
  fs.writeFileSync(path.join(resolved,'verification.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report));
}
if (require.main === module) main().catch(error=>{console.error(JSON.stringify({failedPhase:phase,error:error.name,code:error.code||null,detail:'Sensitive diagnostics withheld. Any archive created is not fully verified unless verification.json confirms it.'}));process.exitCode=1;}).finally(async()=>{
  if(target) await target.end().catch(()=>{});
  if(source) await source.end().catch(()=>{});
  if(container && /^[a-f0-9]{64}$/.test(container)) { try {docker(['rm','--force','--volumes',container]);console.log('Disposable restore container removed.');}catch{console.error('Restore container cleanup requires review.');process.exitCode=1;} }
});
module.exports = { inventory, verifySchema, docker };
