/* eslint-disable @typescript-eslint/no-require-imports -- Node-only browser verification. */
const {chromium}=require('@playwright/test');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true});
 const p=await b.newPage({viewport:{width:1440,height:900}});
 p.on('console',m=>{if(m.type()==='error')console.log('CONSOLE',m.text())});
 await p.goto('http://127.0.0.1:3001/baker');
 await p.evaluate(()=>document.fonts.ready);
 await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(img=>img.decode().catch(()=>{}))));
 console.log(await p.locator('img').evaluateAll(imgs=>imgs.map(i=>({src:i.src,loaded:i.complete,width:i.naturalWidth}))));
 console.log(await p.locator('.baker-app').evaluate(e=>({font:getComputedStyle(e).fontFamily,bg:getComputedStyle(e).backgroundColor})));
 console.log(await p.locator('.baker-app p').first().evaluate(e=>({font:getComputedStyle(e).fontFamily})));
 await p.screenshot({path:'.baker-qa/dashboard-production.png',fullPage:true});
 await b.close();
})().catch(e=>{console.error(e);process.exit(1)});
