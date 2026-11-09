/* eslint-disable @typescript-eslint/no-require-imports -- Isolated cryptographic/database/browser integration. */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),net=require('node:net');
const {spawn,spawnSync}=require('node:child_process');
const {randomBytes,generateKeyPairSync,sign,createHash}=require('node:crypto');
const assert=require('node:assert/strict');
const {Client}=require('pg'),{chromium}=require('@playwright/test');
const root=path.resolve(__dirname,'..');
let container,client,prisma,server,browser,temp,phase='startup';
const saved=new Map(['tsconfig.json','next-env.d.ts'].map(f=>[f,fs.readFileSync(path.join(root,f))]));
function docker(args,extra={}){const r=spawnSync('docker',args,{env:{...process.env,...extra},encoding:'utf8',windowsHide:true,timeout:60000});if(r.error||r.status!==0)throw new Error('Docker test failed');return r.stdout.trim();}
async function freePort(){return new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});}
async function main(){
  const secret=randomBytes(32).toString('hex');
  container=docker(['run','--detach','--name',`alana-owner-test-${randomBytes(6).toString('hex')}`,'--publish','127.0.0.1::5432','--env','POSTGRES_PASSWORD','--env','POSTGRES_DB=alana_owner_setup_test','postgres:17-alpine'],{POSTGRES_PASSWORD:secret});assert.match(container,/^[a-f0-9]{64}$/);
  const port=Number(docker(['port',container,'5432/tcp']).match(/^127\.0\.0\.1:(\d+)$/)?.[1]);assert.ok(port);
  const url=new URL(`postgresql://postgres@127.0.0.1:${port}/alana_owner_setup_test`);url.password=secret;
  for(let n=0;n<60;n++){client=new Client({connectionString:url.toString(),connectionTimeoutMillis:1000});try{await client.connect();break;}catch{await client.end().catch(()=>{});client=null;await new Promise(r=>setTimeout(r,500));}}assert.ok(client);
  for(const m of fs.readFileSync(path.join(root,'database.sql'),'utf8').matchAll(/CREATE TABLE IF NOT EXISTS public\.[\s\S]*?;/g))await client.query(m[0]);
  for(const[i,role]of ['Owner','Daily Worker','Kasir','Baker','Barista'].entries())await client.query('INSERT INTO public.pengguna VALUES ($1,$2,$3,$4,$5)',[`seed00000${i}`,`Synthetic ${i}`,`synthetic${i}`,'synthetic-invalid-seed',role]);
  await client.query("SET alana.auth_schema_approved='yes'");await client.query(fs.readFileSync(path.join(root,'database/proposals/001-pengguna-auth.sql'),'utf8'));
  await client.query("SET alana.payment_schema_approved='yes'");await client.query(fs.readFileSync(path.join(root,'database/proposals/003-kasir-payment-final.sql'),'utf8'));
  const originals=(await client.query('SELECT * FROM public.pengguna ORDER BY id_pengguna')).rows;
  process.env.DATABASE_URL=url.toString();process.env.NODE_ENV='development';
  prisma=require('../lib/prisma.ts').prisma;
  const core=require('../lib/owner-invite-core.ts'),service=require('../lib/owner-setup-service.ts'),passwords=require('../lib/password.ts');
  const baseline=core.ownerBaseline((await client.query("SELECT id_pengguna,nama_pengguna,username,password_hash,peran,status_akun FROM public.pengguna WHERE peran='Owner' ORDER BY id_pengguna")).rows);
  const binding=core.databaseBinding(url.toString());
  temp=fs.mkdtempSync(path.join(os.tmpdir(),'alana-owner-invite-test-'));
  const keys=generateKeyPairSync('rsa',{modulusLength:3072});
  function invitation(name,offset=900000){const dir=fs.mkdtempSync(path.join(temp,'case-'));const payload={version:1,jti:randomBytes(32).toString('hex'),username:name,database:binding,owners:baseline,issuedAt:Date.now()-1000,expiresAt:Date.now()+offset-1000};const bytes=Buffer.from(JSON.stringify(payload));const token=bytes.toString('base64url')+'.'+sign('RSA-SHA256',bytes,keys.privateKey).toString('base64url');const trust={publicKey:keys.publicKey.export({format:'jwk'}),database:binding,payloadDigest:createHash('sha256').update(bytes).digest('hex'),stateDirectory:dir};return{trust,token};}
  const ownerPassword=randomBytes(24).toString('base64');
  const input={username:'browser_owner',name:'Synthetic Browser Owner',phone:'081234567890',email:'test@example.invalid',hash:await passwords.hashPassword(ownerPassword)};
  phase='invalid invitation tests';
  const valid=invitation(input.username);
  await assert.rejects(service.registerFirstOwner(prisma,valid.trust,binding,valid.token.slice(0,-10)+'AAAAAAAAAA',input));
  const expired=invitation(input.username,-1000);await assert.rejects(service.registerFirstOwner(prisma,expired.trust,binding,expired.token,input));
  await assert.rejects(service.registerFirstOwner(prisma,valid.trust,'wrong-database',valid.token,input));
  await assert.rejects(service.registerFirstOwner(prisma,valid.trust,binding,valid.token,{...input,username:'wrong-user'}));
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.pengguna')).rows[0].n,5);
  console.log('PASS: invalid, expired, wrong-database and wrong-recipient invitations rejected; zero accounts added.');
  phase='abrupt server failure after reservation';
  const crash=invitation(input.username);
  const probe=spawnSync(process.execPath,['--conditions=react-server','--import','tsx','scripts/owner-setup-crash-probe.cjs'],{cwd:root,stdio:'ignore',windowsHide:true,timeout:15000,env:{...process.env,ALANA_OWNER_CRASH_PROBE:'isolated-test',ALANA_OWNER_TEST_TRUST:JSON.stringify(crash.trust),ALANA_OWNER_TEST_INPUT:JSON.stringify(input),ALANA_OWNER_TEST_TOKEN:crash.token}});
  if(probe.status!==71)console.log(JSON.stringify({crashProbeExit:probe.status,spawnError:probe.error?.code||null}));
  assert.equal(probe.status,71);assert.ok(fs.existsSync(core.statePath(crash.trust)));
  await assert.rejects(service.registerFirstOwner(prisma,crash.trust,binding,crash.token,input));
  assert.equal((await client.query('SELECT count(*)::int AS n FROM public.pengguna')).rows[0].n,5);
  console.log('PASS: abrupt process termination rolls back account transaction; durable reservation denies retry after restart.');
  phase='concurrent first-owner creation';
  const race=await Promise.allSettled([service.registerFirstOwner(prisma,valid.trust,binding,valid.token,input),service.registerFirstOwner(prisma,valid.trust,binding,valid.token,input)]);
  assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(race.filter(r=>r.status==='rejected').length,1);
  await assert.rejects(service.registerFirstOwner(prisma,valid.trust,binding,valid.token,input));
  assert.equal((await client.query("SELECT count(*)::int AS n FROM public.pengguna WHERE peran='Owner' AND status_akun='ACTIVE'")).rows[0].n,1);
  const second=invitation('another_owner');await assert.rejects(service.registerFirstOwner(prisma,second.trust,binding,second.token,{...input,username:'another_owner'}));
  const created=(await client.query('SELECT * FROM public.pengguna WHERE username=$1',[input.username])).rows[0];assert.ok(await passwords.verifyPassword(created.password_hash,ownerPassword));
  assert.deepEqual((await client.query("SELECT * FROM public.pengguna WHERE id_pengguna LIKE 'seed%' ORDER BY id_pengguna")).rows,originals);
  console.log('PASS: exactly one concurrent signup commits; token replay and second bootstrap denied; old Owner and four staff unchanged/PENDING.');
  phase='additional Owner approval workflow';
  await require('../lib/auth-repository.ts').requestAdditionalOwner({id:'request001',name:'Synthetic Request',username:'requested_owner',phone:'081234567891',email:null,hash:await passwords.hashPassword(randomBytes(24).toString('base64'))});
  assert.equal((await client.query("SELECT status_akun FROM public.pengguna WHERE username='requested_owner'")).rows[0].status_akun,'PENDING');
  const staffPassword=randomBytes(24).toString('base64');await prisma.pengguna.create({data:{id_pengguna:'staff001',nama_pengguna:'Synthetic Staff',username:'browser_staff',password_hash:await passwords.hashPassword(staffPassword),peran:'Kasir',status_akun:'ACTIVE'}});
  phase='browser server';const httpPort=await freePort(),base=`http://127.0.0.1:${httpPort}`;
  server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(httpPort)],{cwd:root,windowsHide:true,stdio:'ignore',env:{...process.env,ALANA_DATABASE_AUTH:'enabled',ALANA_SIGNUP:'enabled',ALANA_OWNER_BOOTSTRAP:'enabled',ALANA_OWNER_REQUESTS:'enabled',ALANA_APPROVALS:'',ALANA_LOCAL_STAFF_SIGNUP:'enabled',ALANA_ISOLATED_AUTH_TEST:'enabled',ALANA_SESSION_SECRET:randomBytes(40).toString('hex'),ALANA_REDIS_REST_URL:'',ALANA_REDIS_REST_TOKEN:''}});
  let ready=false;for(let n=0;n<90;n++){try{if((await fetch(base+'/login',{signal:AbortSignal.timeout(2000)})).ok){ready=true;break;}}catch{/* no raw logs */}await new Promise(r=>setTimeout(r,500));}assert.ok(ready);
  browser=await chromium.launch({channel:'chrome',headless:true});const context=await browser.newContext(),page=await context.newPage();page.setDefaultTimeout(25000);
  async function login(username,password,role){await page.goto(base+'/login');await page.locator('label.a-role').filter({has:page.getByRole('radio',{name:role,exact:true})}).click();await page.locator('#auth-username').fill(username);await page.locator('#auth-password').fill(password);await page.getByRole('button',{name:/^(Sign In|Masuk)$/}).click();}
  phase='Owner browser Login';await login(input.username,ownerPassword,'Owner');await page.waitForURL('**/owner');assert.equal((await context.cookies()).find(c=>c.name==='alana_session').httpOnly,true);
  await page.getByRole('button',{name:'Keluar',exact:true}).click();await page.getByRole('button',{name:'Ya, keluar',exact:true}).click();await page.waitForURL('**/login');await page.goto(base+'/owner');await page.waitForURL('**/login');
  phase='same browser form for subsequent Owner request';
  const requestedPassword=randomBytes(24).toString('base64');await page.goto(base+'/register?role=owner');await page.locator('#auth-fullName').fill('Synthetic Requested Owner');await page.locator('#auth-username').fill('browser_requested');await page.locator('#auth-phone').fill('081234567891');await page.locator('#auth-email').fill('');await page.locator('#auth-password').fill(requestedPassword);await page.locator('#auth-confirmPassword').fill(requestedPassword);await page.getByRole('button',{name:'Sign up',exact:true}).click();await page.waitForURL('**/login?registered=pending&role=owner');
  const requested=(await client.query("SELECT status_akun,password_hash FROM public.pengguna WHERE username='browser_requested'")).rows[0];assert.equal(requested.status_akun,'PENDING');assert.ok(await passwords.verifyPassword(requested.password_hash,requestedPassword));
  await login('browser_requested',requestedPassword,'Owner');await page.getByRole('alert').waitFor();assert.ok(new URL(page.url()).pathname==='/login');
  phase='staff cross-role guard';await login('browser_staff',staffPassword,'Kasir');await page.waitForURL('**/kasir');await page.goto(base+'/owner');await page.waitForURL('**/kasir');
  assert.deepEqual((await client.query("SELECT * FROM public.pengguna WHERE id_pengguna LIKE 'seed%' ORDER BY id_pengguna")).rows,originals);
  console.log('PASS browser: Owner Login to /owner, HttpOnly session, Logout, same-form additional Owner registration PENDING/Argon2id, pending Login denied, unauthenticated guard, and Kasir denied /owner.');
  console.log('LIMIT: test signing authority is an in-memory RSA fixture, not Windows administrator authorization; interactive UAC issuance is not exercised by this harness.');
}
main().catch(e=>{console.error(JSON.stringify({failedPhase:phase,error:e.name,code:e.code||null,sensitiveDetailsWithheld:true}));process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close().catch(()=>{});if(server?.pid)spawnSync('taskkill',['/PID',String(server.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});if(prisma)await prisma.$disconnect();if(client)await client.end().catch(()=>{});
  if(container&&/^[a-f0-9]{64}$/.test(container)){try{docker(['rm','--force','--volumes',container]);}catch{process.exitCode=1;}}
  if(temp){const resolved=path.resolve(temp);if(resolved.startsWith(path.resolve(os.tmpdir())+path.sep)&&path.basename(resolved).startsWith('alana-owner-invite-test-'))fs.rmSync(resolved,{recursive:true,force:true});}
  for(const[file,data]of saved)fs.writeFileSync(path.join(root,file),data);
  console.log('Isolated Owner test resources cleaned up.');
});
