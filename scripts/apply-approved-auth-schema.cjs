/* eslint-disable @typescript-eslint/no-require-imports -- Explicitly approved, single-attempt schema operation. */
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { randomBytes, createHash } = require('node:crypto');
const { Client } = require('pg');
const { inventory, verifySchema, docker } = require('./backup-auth-source.cjs');
const root = path.resolve(__dirname,'..');
let source, target, container, transaction = false, committed = false, phase = 'approval';
async function main() {
  assert.equal(process.env.ALANA_SCHEMA_EXECUTION_APPROVED,'approved');
  const directory = process.env.ALANA_BACKUP_DIRECTORY;
  assert.ok(directory && !path.resolve(directory).toLowerCase().startsWith(root.toLowerCase()+path.sep));
  const manifest = JSON.parse(fs.readFileSync(path.join(directory,'verification.json'),'utf8'));
  assert.ok(manifest.restoreVerified && manifest.sourceUnchanged && manifest.tableCount === 15 && manifest.initialAccountCount === 5);
  assert.equal(path.basename(manifest.file),manifest.file);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(directory,manifest.file))).digest('hex'),manifest.sha256);
  phase = 'restore verified backup for exact source comparison';
  const secret = randomBytes(32).toString('hex');
  container = docker(['run','--detach','--name',`alana-schema-preflight-${randomBytes(6).toString('hex')}`,'--publish','127.0.0.1::5432','--mount',`type=bind,source=${directory},target=/backup,readonly`,'--env','POSTGRES_PASSWORD','--env','POSTGRES_DB=alana_restore_check','postgres:17-alpine'],{POSTGRES_PASSWORD:secret});
  assert.match(container,/^[a-f0-9]{64}$/);
  const port = Number(docker(['port',container,'5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/)?.[1]); assert.ok(port);
  const targetUrl = new URL(`postgresql://postgres@127.0.0.1:${port}/alana_restore_check`); targetUrl.password=secret;
  for(let attempt=0;attempt<60;attempt++) {
    target=new Client({connectionString:targetUrl.toString(),connectionTimeoutMillis:1000});
    try { await target.connect(); break; } catch {await target.end().catch(()=>{});target=null;await new Promise(resolve=>setTimeout(resolve,500));}
  }
  assert.ok(target);
  docker(['exec',container,'pg_restore','--exit-on-error','--single-transaction','--no-owner','--no-privileges','-U','postgres','-d','alana_restore_check',`/backup/${manifest.file}`]);
  await target.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const backup = await inventory(target); verifySchema(backup);
  const backupAccounts = (await target.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows;
  await target.query('ROLLBACK');
  const env = {...require('dotenv').parse(fs.readFileSync(path.join(root,'.env'))),...process.env};
  for(const name of ['ALANA_DATABASE_AUTH','ALANA_SIGNUP','ALANA_APPROVALS']) assert.notEqual(env[name],'enabled');
  const url=new URL(env.DATABASE_URL); url.searchParams.delete('schema');
  assert.ok(!/alana_auth_test|alana_restore_check/i.test(decodeURIComponent(url.pathname)));
  assert.notEqual(url.toString(),targetUrl.toString());
  source=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000}); await source.connect();
  phase='source read-only preflight';
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const before=await inventory(source); verifySchema(before); assert.deepEqual(before,backup);
  const accounts=(await source.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows;
  assert.deepEqual(accounts,backupAccounts);
  const counts=before.data.map(({schema_name,table_name,count})=>({schema_name,table_name,count})); assert.deepEqual(counts,manifest.rowCounts);
  await source.query('ROLLBACK');
  console.log('Preflight PASS: backup checksum/restore, exact source schema and all table data unchanged; 15 tables, five original accounts; auth flags disabled.');
  const draft=fs.readFileSync(path.join(root,'database/proposals/001-pengguna-auth.sql'),'utf8');
  assert.ok(/COMMIT;\s*$/.test(draft));
  const draftSha256=createHash('sha256').update(draft).digest('hex');
  phase='single approved draft execution';
  await source.query("SET alana.auth_schema_approved = 'yes'");
  transaction=true;
  // Execute the approved draft once; defer its final COMMIT until read-only assertions pass.
  await source.query(draft.replace(/COMMIT;\s*$/,''));
  phase='in-transaction verification';
  const after=await inventory(source);
  assert.deepEqual(after.tables,before.tables);
  const originalData=after.data.filter(t=>t.table_name!=='pengguna');
  assert.deepEqual(originalData,before.data.filter(t=>t.table_name!=='pengguna'));
  assert.deepEqual((await source.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows,accounts);
  const users=(await source.query('SELECT status_akun,nomor_hp,email,diputuskan_oleh,diputuskan_pada FROM public.pengguna')).rows;
  assert.equal(users.length,5); assert.ok(users.every(r=>r.status_akun==='PENDING' && r.nomor_hp===null && r.email===null && r.diputuskan_oleh===null && r.diputuskan_pada===null));
  const added=after.columns.filter(c=>c.table_schema==='public'&&c.table_name==='pengguna'&&!before.columns.some(b=>b.table_schema===c.table_schema&&b.table_name===c.table_name&&b.column_name===c.column_name));
  assert.equal(added.length,5);
  for(const [name,type,length,nullable] of [['nomor_hp','character varying',32,'YES'],['email','character varying',254,'YES'],['status_akun','character varying',10,'NO'],['diputuskan_oleh','character varying',10,'YES'],['diputuskan_pada','timestamp with time zone',null,'YES']]) {
    const c=added.find(c=>c.column_name===name); assert.ok(c); assert.equal(c.data_type,type); assert.equal(c.character_maximum_length,length); assert.equal(c.is_nullable,nullable);
    if(name==='status_akun') assert.equal(c.column_default,"'PENDING'::character varying"); else assert.equal(c.column_default,null);
    if(name==='diputuskan_pada') assert.equal(c.datetime_precision,6);
  }
  assert.deepEqual(after.columns.filter(c=>!added.includes(c)),before.columns);
  const newConstraints=after.constraints.filter(c=>!before.constraints.some(b=>JSON.stringify(b)===JSON.stringify(c)));
  assert.equal(newConstraints.length,2); assert.equal(after.constraints.length,before.constraints.length+2);
  assert.ok(newConstraints.some(c=>c.conname==='ck_pengguna_status_akun'&&c.definition.includes('PENDING')&&c.definition.includes('ACTIVE')&&c.definition.includes('REJECTED')));
  assert.ok(newConstraints.some(c=>c.conname==='fk_pengguna_diputuskan_oleh'&&c.definition.includes('REFERENCES pengguna(id_pengguna)')&&c.definition.includes('ON UPDATE RESTRICT ON DELETE RESTRICT')));
  const newIndexes=after.indexes.filter(i=>!before.indexes.some(b=>JSON.stringify(b)===JSON.stringify(i)));
  assert.equal(after.indexes.length,before.indexes.length+1); assert.equal(newIndexes.length,1); assert.equal(newIndexes[0].indexname,'ix_pengguna_status_username');
  await source.query('COMMIT'); transaction=false; committed=true;
  phase='post-commit read-only verification';
  await source.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  assert.deepEqual(await inventory(source),after);
  assert.deepEqual((await source.query('SELECT id_pengguna,nama_pengguna,username,password_hash,peran FROM public.pengguna ORDER BY id_pengguna')).rows,accounts);
  await source.query('ROLLBACK');
  const report={appliedAt:new Date().toISOString(),committed:true,draftSha256,sourceMatchedVerifiedBackup:true,tableCount:15,totalRows:counts.reduce((n,r)=>n+Number(r.count),0),accountCount:5,originalAccountFieldsUnchanged:true,allOtherTableDataUnchanged:true,newColumnCount:5,userColumnCount:10,allAccountsPending:true,newConstraints:2,newIndexes:1,authFlagsDisabled:true};
  fs.writeFileSync(path.join(directory,'schema-application.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report));
}
main().catch(async error=>{
  if(transaction && source) await source.query('ROLLBACK').catch(()=>{});
  console.error(JSON.stringify({failedPhase:phase,error:error.name,code:error.code||null,committed,noAutomaticRetry:true,sensitiveDetailsWithheld:true}));process.exitCode=1;
}).finally(async()=>{
  if(source) await source.end().catch(()=>{}); if(target) await target.end().catch(()=>{});
  if(container&&/^[a-f0-9]{64}$/.test(container)){try{docker(['rm','--force','--volumes',container]);console.log('Preflight restore container removed.');}catch{console.error('Preflight container cleanup needs review.');process.exitCode=1;}}
});
