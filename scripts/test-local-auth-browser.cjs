/* eslint-disable @typescript-eslint/no-require-imports -- Isolated browser/database test harness. */
const fs=require('node:fs'),path=require('node:path'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {randomBytes}=require('node:crypto');
const assert=require('node:assert/strict');
const {Client}=require('pg');
const {chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
let container,client,server,browser,phase='startup';
const savedFiles=new Map(['tsconfig.json','next-env.d.ts'].map(f=>[f,fs.existsSync(path.join(root,f))?fs.readFileSync(path.join(root,f)):null]));
function docker(args,extra={}){const r=spawnSync('docker',args,{env:{...process.env,...extra},encoding:'utf8',windowsHide:true,timeout:60000});if(r.error||r.status!==0)throw new Error('Docker operation failed.');return r.stdout.trim();}
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});}
async function main(){
  const secret=randomBytes(32).toString('hex');
  container=docker(['run','--detach','--name',`alana-browser-${randomBytes(6).toString('hex')}`,'--publish','127.0.0.1::5432','--env','POSTGRES_PASSWORD','--env','POSTGRES_DB=alana_browser_test','postgres:17-alpine'],{POSTGRES_PASSWORD:secret});
  assert.match(container,/^[a-f0-9]{64}$/);
  const dbPort=Number(docker(['port',container,'5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/)?.[1]);assert.ok(dbPort);
  const url=new URL(`postgresql://postgres@127.0.0.1:${dbPort}/alana_browser_test`);url.password=secret;
  for(let n=0;n<60;n++){client=new Client({connectionString:url.toString(),connectionTimeoutMillis:1000});try{await client.connect();break;}catch{await client.end().catch(()=>{});client=null;await new Promise(r=>setTimeout(r,500));}}
  assert.ok(client);
  const ddl=[...fs.readFileSync(path.join(root,'database.sql'),'utf8').matchAll(/CREATE TABLE IF NOT EXISTS public\.[\s\S]*?;/g)].map(m=>m[0]);assert.equal(ddl.length,15);for(const sql of ddl)await client.query(sql);
  for(const [i,role]of ['Owner','Daily Worker','Kasir','Baker','Barista'].entries())await client.query('INSERT INTO public.pengguna VALUES ($1,$2,$3,$4,$5)',[`test00000${i}`,`Synthetic ${i}`,`synthetic${i}`,'invalid-synthetic-seed',role]);
  await client.query("SET alana.auth_schema_approved='yes'");await client.query(fs.readFileSync(path.join(root,'database/proposals/001-pengguna-auth.sql'),'utf8'));
  await client.query("SET alana.payment_schema_approved='yes'");await client.query(fs.readFileSync(path.join(root,'database/proposals/003-kasir-payment-final.sql'),'utf8'));
  const originals=(await client.query('SELECT * FROM public.pengguna ORDER BY id_pengguna')).rows;
  const port=await freePort(),base=`http://127.0.0.1:${port}`;
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:root,windowsHide:true,stdio:'ignore',env:{...process.env,NODE_ENV:'development',DATABASE_URL:url.toString(),ALANA_DATABASE_AUTH:'enabled',ALANA_SIGNUP:'enabled',ALANA_APPROVALS:'',ALANA_LOCAL_STAFF_SIGNUP:'enabled',ALANA_ISOLATED_AUTH_TEST:'enabled',ALANA_SESSION_SECRET:randomBytes(40).toString('hex'),ALANA_REDIS_REST_URL:'',ALANA_REDIS_REST_TOKEN:'',ALANA_TRUST_PROXY:'false'}});
  phase='test server readiness';let ready=false;for(let n=0;n<90;n++){try{const r=await fetch(base+'/login',{signal:AbortSignal.timeout(2000)});if(r.ok){ready=true;break;}}catch{/* No diagnostics containing test secrets. */}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(25000);
  phase='unauthenticated route guard';await page.goto(base+'/kasir');await page.waitForURL('**/login');
  const username='cashier'+randomBytes(4).toString('hex'),password=randomBytes(24).toString('base64');
  async function register(name,role='Kasir',productionRole){
    const previousPhase=phase;phase=previousPhase+' / role selection';
    await page.goto(base+'/register');await page.locator('label.a-role').filter({has:page.getByRole('radio',{name:role,exact:true})}).click();
    if(productionRole)await page.locator('#production-role').selectOption(productionRole);
    phase=previousPhase+' / form input';
    await page.locator('#auth-fullName').fill('Synthetic Browser User');await page.locator('#auth-username').fill(name);await page.locator('#auth-phone').fill('081234567890');await page.locator('#auth-email').fill('test@example.invalid');await page.locator('#auth-password').fill(password);await page.locator('#auth-confirmPassword').fill(password);
  }
  phase='browser Sign Up';await register(username);phase='browser Sign Up / submit';await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.waitForURL('**/login?registered=active');
  const account=(await client.query('SELECT * FROM public.pengguna WHERE username=$1',[username])).rows[0];assert.equal(account.status_akun,'ACTIVE');assert.equal(account.peran,'Kasir');assert.ok(account.password_hash.startsWith('$argon2id$'));assert.notEqual(account.password_hash,password);assert.equal(account.nomor_hp,'081234567890');assert.equal(account.email,'test@example.invalid');
  console.log('PASS browser: Sign Up Kasir stores ACTIVE account, contacts and Argon2id on isolated PostgreSQL.');
  phase='duplicate username';await register(username);await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal((await client.query('SELECT count(*)::int AS n FROM public.pengguna WHERE username=$1',[username])).rows[0].n,1);
  phase='Owner registration blocked';await register('owner'+randomBytes(4).toString('hex'));const owner=page.getByRole('radio',{name:'Owner',exact:true});assert.equal(await owner.isDisabled(),true);await owner.evaluate(e=>{e.disabled=false;});await page.locator('label.a-role').filter({has:owner}).click();await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.getByRole('alert').waitFor();assert.equal((await client.query("SELECT count(*)::int AS n FROM public.pengguna WHERE peran='Owner'")).rows[0].n,1);
  phase='Barista registration';const baristaName='barista'+randomBytes(4).toString('hex');await register(baristaName,'Baker/Barista','barista');await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.waitForURL('**/login?registered=active');const barista=(await client.query('SELECT peran,status_akun FROM public.pengguna WHERE username=$1',[baristaName])).rows[0];assert.deepEqual(barista,{peran:'Barista',status_akun:'ACTIVE'});
  async function login(value,role='Kasir') {await page.goto(base+'/login');await page.locator('label.a-role').filter({has:page.getByRole('radio',{name:role,exact:true})}).click();await page.locator('#auth-username').fill(username);await page.locator('#auth-password').fill(value);await page.getByRole('button',{name:/^(Sign In|Masuk)$/}).click();}
  phase='wrong password';await login(randomBytes(24).toString('hex'));await page.getByRole('alert').waitFor();assert.ok(new URL(page.url()).pathname==='/login');
  phase='wrong Login role';await login(password,'Owner');await page.getByRole('alert').waitFor();
  phase='browser Login';await login(password);await page.waitForURL('**/kasir');assert.equal((await context.cookies()).find(c=>c.name==='alana_session').httpOnly,true);
  phase='cross-role guard and refresh';await page.goto(base+'/owner');await page.waitForURL('**/kasir');await page.reload();await page.waitForURL('**/kasir');
  phase='browser Logout';await page.getByRole('button',{name:'Keluar',exact:true}).click();await page.getByRole('button',{name:'Ya, keluar',exact:true}).click();await page.waitForURL('**/login');assert.equal((await context.cookies()).some(c=>c.name==='alana_session'),false);await page.goto(base+'/kasir');await page.waitForURL('**/login');
  assert.deepEqual((await client.query("SELECT * FROM public.pengguna WHERE id_pengguna LIKE 'test%' ORDER BY id_pengguna")).rows,originals);
  assert.equal((await client.query("SELECT count(*)::int AS n FROM public.pengguna WHERE id_pengguna LIKE 'test%' AND status_akun='PENDING'")).rows[0].n,5);
  console.log('PASS browser: duplicate username, Owner tampering, wrong password/role, Login, Kasir dashboard, cross-role guard, refresh, Logout and post-logout guard. Five original synthetic accounts unchanged/PENDING.');
}
main().catch(e=>{console.error(JSON.stringify({failedPhase:phase,error:e.name,code:e.code||null,sensitiveDetailsWithheld:true}));process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close().catch(()=>{});
  if(server?.pid){spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});}
  if(client)await client.end().catch(()=>{});
  if(container&&/^[a-f0-9]{64}$/.test(container)){try{docker(['rm','--force','--volumes',container]);console.log('Isolated browser test server/container cleaned up.');}catch{process.exitCode=1;}}
  for(const[file,data]of savedFiles){if(data)fs.writeFileSync(path.join(root,file),data);}
});
