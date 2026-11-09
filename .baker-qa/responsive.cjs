/* eslint-disable @typescript-eslint/no-require-imports -- Node-only browser verification. */
const {chromium,expect}=require('@playwright/test');
const fs=require('fs');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});
 const p=await b.newPage({viewport:{width:1440,height:900}});
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 async function shot(name){await p.evaluate(()=>document.fonts.ready);await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));await p.screenshot({path:'.baker-qa/'+name+'.png',fullPage:true,animations:'disabled'});}
 await p.goto('http://127.0.0.1:3002/baker');
 await p.getByRole('button',{name:'Notifikasi',exact:true}).click();await shot('notifications');
 await p.keyboard.press('Escape');await p.getByRole('button',{name:'Keluar',exact:true}).click();await shot('logout');
 await p.getByRole('button',{name:'Batal',exact:true}).click();
 const checks=[];
 for(const width of [360,768,1024]){
  await p.setViewportSize({width,height:900});
  for(const path of ['/baker','/baker/stok-bahan','/baker/pemakaian-bahan','/baker/tentang-alana','/baker/pencarian']){
   await p.goto('http://127.0.0.1:3002'+path);
   const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
   if(overflow)throw Error(width+'px overflow '+path);
   checks.push(width+'px '+path);
  }
 }
 await p.setViewportSize({width:390,height:844});
 await p.goto('http://127.0.0.1:3002/baker/pemakaian-bahan');
 await p.getByRole('button',{name:/PRD-02/}).click();
 await p.getByRole('spinbutton',{name:'Hasil Produksi (pcs)'}).fill('0');
 await p.getByRole('button',{name:'Simpan Produksi'}).click();await expect(p.locator('.b-error')).toBeVisible();
 await p.getByRole('spinbutton',{name:'Hasil Produksi (pcs)'}).fill('24');
 await p.getByRole('button',{name:'Simpan Produksi'}).click();
 await expect(p.locator('.b-production-panel')).toContainText('stok diperbarui');
 await shot('mobile-production-success');
 await p.getByRole('textbox',{name:'Pencarian global'}).fill('susu');
 await p.getByRole('textbox',{name:'Pencarian global'}).press('Enter');
 await expect(p.locator('.b-search-result').first()).toContainText('Susu Cair');await shot('mobile-search');
 fs.writeFileSync('.baker-qa/responsive-results.json',JSON.stringify({checks,mobileProduction:'passed',mobileValidation:'passed',mobileSearch:'passed',errors},null,2));
 console.log('PASS 15 responsive checks, mobile validation/production/search; errors:',errors);
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
