/* eslint-disable @typescript-eslint/no-require-imports -- Interactive local-only audited bootstrap launcher. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {createHash}=require('node:crypto');
const {Client}=require('pg');
const {inventory}=require('./backup-auth-source.cjs');
const root=path.resolve(__dirname,'..');
let client;
async function main(){
  assert.ok(process.stdin.isTTY&&process.stdout.isTTY);
  const directory=process.env.ALANA_BOOTSTRAP_BACKUP_DIRECTORY;
  assert.ok(directory&&!path.resolve(directory).toLowerCase().startsWith(root.toLowerCase()+path.sep));
  const resultFile=path.join(directory,'owner-password-result.json');
  assert.ok(!fs.existsSync(resultFile));
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'verification.json'),'utf8'));
  assert.ok(manifest.restoreVerified);
  assert.equal(createHash('sha256').update(fs.readFileSync(path.join(directory,manifest.file))).digest('hex'),manifest.sha256);
  const env={...require('dotenv').parse(fs.readFileSync(path.join(root,'.env'))),...process.env};
  for(const key of ['ALANA_DATABASE_AUTH','ALANA_SIGNUP','ALANA_APPROVALS']) assert.notEqual(env[key],'enabled');
  const url=new URL(env.DATABASE_URL);url.searchParams.delete('schema');
  assert.ok(!/alana_auth_test|alana_restore_check/i.test(decodeURIComponent(url.pathname)));
  client=new Client({connectionString:url.toString(),connectionTimeoutMillis:10000});await client.connect();
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const before=await inventory(client);
  const accounts=(await client.query('SELECT * FROM public.pengguna ORDER BY id_pengguna')).rows;
  assert.equal(before.tables.length,15);assert.equal(accounts.length,5);assert.ok(accounts.every(a=>a.status_akun==='PENDING'));
  const owner=accounts.filter(a=>a.peran==='Owner');assert.equal(owner.length,1);
  const block=fs.readFileSync(path.join(root,'database.sql'),'utf8').match(/INSERT INTO public\.pengguna\s*\([^;]*?VALUES([\s\S]*?);/i)?.[1]||'';
  const expected=[...block.matchAll(/\(([^()]*)\)/g)].map(m=>[...m[1].matchAll(/'((?:''|[^'])*)'/g)].map(v=>v[1].replaceAll("''","'")));
  assert.ok(accounts.every(r=>expected.some(e=>e[0]===r.id_pengguna&&e[1]===r.nama_pengguna&&e[2]===r.username&&e[3]===r.password_hash&&e[4]===r.peran)));
  await client.query('ROLLBACK');
  console.log('Preflight sesuai. Hanya password Owner akan ditetapkan; seluruh status tetap PENDING.');
  console.log('Gunakan password unik 12-128 karakter, minimal 3 jenis karakter, atau frasa 4 kata minimal 20 karakter. Input password tidak akan ditampilkan.');
  const child=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','scripts/set-initial-passwords.ts','--owner-only'],{cwd:root,stdio:'inherit',env:{...env,ALANA_ALLOW_INITIAL_PASSWORD_WRITE:'approved'}});
  if(child.error||child.status!==0) throw new Error('Local password input cancelled or bootstrap failed.');
  await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const after=await inventory(client);
  const afterAccounts=(await client.query('SELECT * FROM public.pengguna ORDER BY id_pengguna')).rows;
  assert.deepEqual(after.tables,before.tables);assert.deepEqual(after.columns,before.columns);assert.deepEqual(after.constraints,before.constraints);assert.deepEqual(after.indexes,before.indexes);
  assert.deepEqual(after.data.filter(t=>t.table_name!=='pengguna'),before.data.filter(t=>t.table_name!=='pengguna'));
  assert.equal(afterAccounts.length,5);
  for(let i=0;i<accounts.length;i++){
    const a=accounts[i],b=afterAccounts[i];
    if(a.peran==='Owner'){assert.notEqual(a.password_hash,b.password_hash);assert.ok(b.password_hash.startsWith('$argon2id$'));assert.deepEqual({...b,password_hash:a.password_hash},a);}
    else assert.deepEqual(b,a);
  }
  assert.ok(afterAccounts.every(a=>a.status_akun==='PENDING'));
  await client.query('ROLLBACK');
  const report={verifiedAt:new Date().toISOString(),success:true,scope:'Owner password_hash only',argon2id:true,accountCount:5,allIdentitiesAndRolesUnchanged:true,otherFourAccountsUnchanged:true,allPending:true,otherTablesUnchanged:true,schemaUnchanged:true,authenticationStillDisabled:true};
  fs.writeFileSync(resultFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log('BERHASIL: hanya password Owner berubah; 5 akun tetap PENDING. Autentikasi tetap nonaktif.');
}
main().catch(()=>{console.error('DIBATALKAN/GAGAL: proses dihentikan. Tidak ada percobaan ulang otomatis; minta pemeriksaan status sebelum mencoba lagi.');process.exitCode=1;}).finally(async()=>{if(client)await client.end().catch(()=>{});});
