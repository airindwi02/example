/* eslint-disable @typescript-eslint/no-require-imports -- Node-only visual QA. */
const {chromium,expect}=require('@playwright/test');const fs=require('fs');
(async()=>{
const browser=await chromium.launch({channel:'chrome',headless:true});
const p=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const base=process.env.WORKER_BASE||'http://127.0.0.1:3000';const captures=[];const errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
async function go(path){await p.goto(base+'/daily-worker'+path);await p.locator('.w-content h2').first().waitFor();}
async function shot(source,name){await p.evaluate(()=>document.fonts.ready);await p.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode().catch(()=>{}))));await p.evaluate(()=>{if(document.activeElement instanceof HTMLElement)document.activeElement.blur()});await p.mouse.move(1439,899);await p.screenshot({path:'.worker-qa/'+name+'.png',fullPage:true,animations:'disabled'});captures.push({source,name});console.log('CAPTURE',name);}
await go('');await shot('Worker Dashboard','dashboard');
await p.getByRole('button',{name:'Keluar',exact:true}).click();await shot('Worker Dashboard-1','logout');await p.getByRole('button',{name:'Batal',exact:true}).click();
await p.getByRole('button',{name:'Notifikasi',exact:true}).click();await shot('Worker Notifikasi Dropdown','notifications');
await go('/penerimaan');await shot('Worker Penerimaan Form','receiving-form');
await p.getByRole('combobox',{name:'Nama Bahan',exact:true}).selectOption('BHN-02');await p.getByLabel('Tanggal Penerimaan',{exact:true}).fill('');await p.getByRole('button',{name:'Simpan Penerimaan',exact:true}).click();await shot('Worker Penerimaan Isian Diperbaiki','receiving-error');
await p.getByLabel('Jumlah',{exact:true}).fill('20');await p.getByLabel('Tanggal Penerimaan',{exact:true}).fill('22/10/2026');await p.getByRole('button',{name:'Simpan Penerimaan',exact:true}).click();await shot('Worker Penerimaan Berhasil','receiving-success');
await go('/stok-barang');await shot('Worker Stok Barang Pilih Barang','stock-empty');
await p.getByRole('row').filter({hasText:'Tepung Terigu'}).click();await shot('Worker Stok Barang Jumlah Terpilih','stock-selected');
await go('/kadaluwarsa');await shot('Worker Kadaluwarsa Daftar','expiry-list');
await p.getByRole('button',{name:'Tindak Susu Cair',exact:true}).click();await shot('Worker Kadaluwarsa Sesuaikan Stok','expiry-form');
await p.getByRole('button',{name:'Catat Penyesuaian',exact:true}).click();await shot('Worker Kadaluwarsa Sesuaikan Stok-1','expiry-success');
await p.getByRole('button',{name:'Tindak Whipping Cream',exact:true}).click();await p.getByRole('button',{name:'Catat Penyesuaian',exact:true}).click();await expect(p.getByRole('heading',{name:'Tidak ada peringatan kadaluwarsa'})).toBeVisible();await shot('Worker Kadaluwarsa Kosong','expiry-empty');
await go('/pemeriksaan');await shot('Worker Pemeriksaan Pilih Barang','inspection-empty');
await p.getByRole('button',{name:'Tepung Terigu',exact:true}).click();await shot('Worker Pemeriksaan Masukkan Stok Aktual','inspection-form');
await p.getByLabel('Stok Aktual',{exact:true}).fill('empat');await p.getByRole('button',{name:'Simpan Pemeriksaan',exact:true}).click();await shot('Worker Pemeriksaan Isian Diperbaiki','inspection-error');
await p.getByLabel('Stok Aktual',{exact:true}).fill('4');await p.getByRole('button',{name:'Simpan Pemeriksaan',exact:true}).click();await shot('Worker Pemeriksaan Data Tersimpan','inspection-success');
await go('/penyesuaian');await shot('Worker Penyesuaian Form Hasil Hitung','adjustment-form');
await p.getByLabel('Hasil Hitung Fisik',{exact:true}).fill('-2');await p.getByRole('button',{name:'Periksa Selisih',exact:true}).click();await shot('Worker Penyesuaian Koreksi Jumlah','adjustment-error');
await p.getByLabel('Hasil Hitung Fisik',{exact:true}).fill('3');await p.getByRole('button',{name:'Periksa Selisih',exact:true}).click();await shot('Worker Penyesuaian Ada Selisih Catat','adjustment-difference');
await p.getByLabel('Hasil Hitung Fisik',{exact:true}).fill('4');await p.getByRole('button',{name:'Periksa Selisih',exact:true}).click();await shot('Penyesuaian Stok Dipertahankan','adjustment-equal');
await p.getByLabel('Hasil Hitung Fisik',{exact:true}).fill('3');await p.getByRole('button',{name:'Periksa Selisih',exact:true}).click();await p.getByLabel('Catatan (opsional)',{exact:true}).fill('Kemasan bocor');await p.getByRole('button',{name:'Catat Penyesuaian',exact:true}).click();await shot('Penyesuaian Hasil Tersimpan','adjustment-success');
await go('/tentang-alana');await shot('Worker Tentang Alana','about');
await go('/pencarian?q=cokelat');await expect(p.locator('.w-search-count')).toHaveText('3 hasil ditemukan');await shot('Worker Pencarian','search');
fs.writeFileSync('.worker-qa/captures.json',JSON.stringify({captures,errors,base},null,2));
await browser.close();console.log('CAPTURED',captures.length,'ERRORS',errors);if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});