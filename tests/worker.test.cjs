/* eslint-disable @typescript-eslint/no-require-imports -- Database-free unit tests loaded through tsx. */
const test=require('node:test'),assert=require('node:assert/strict');
const {saveWorker}=require('../lib/worker-service.ts');
const {parseQuantity,parseDate,daysUntil}=require('../app/daily-worker/data.ts');
test('quantity/date validation does not normalize invalid values into stock writes',()=>{
 for(const input of ['-1','1.001','NaN','Infinity','100000000'])assert.equal(parseQuantity(input,true),null);
 assert.equal(parseQuantity('0',true),0);assert.equal(parseQuantity('1,25'),1.25);
 assert.equal(parseDate('30/02/2026'),null);assert.equal(parseDate('29/02/2028'),'2028-02-29');assert.equal(daysUntil(''),Infinity);
});
test('unsupported disposal/notes and invalid amounts fail before opening a database transaction',async()=>{
 const client={$transaction(){throw new Error('Database must not be reached');}};
 const base={type:'adjust',id:'TEST001',unit:'kg',expectedStock:'10',actual:'8',token:'abcdef012345678'};
 for(const patch of [{actual:'-1'},{actual:'1.001'},{actual:'100000000'},{token:'bad'},{batch:'batch001'},{note:'No storage field'}])await assert.rejects(saveWorker(client,{}, {...base,...patch}),e=>e.name==='Error'&&e.message!=='Database must not be reached');
});
test('receiving requires a valid order, supplier, quantities and reason for partial acceptance',async()=>{
 const client={$transaction(){throw new Error('Database must not be reached');}};
 const base={type:'receive',id:'TEST001',unit:'kg',expectedStock:'10',token:'abcdef012345678',amount:'2',sent:'3',date:'2026-11-09',supplierId:'SUP001',orderId:'PO001',condition:'Baik',reason:'Damaged packaging'};
 for(const patch of [{amount:'0'},{sent:'1'},{reason:''},{orderId:''},{supplierId:''},{date:'2026-02-30'},{expiry:'invalid'}])await assert.rejects(saveWorker(client,{}, {...base,...patch}),e=>e.message!=='Database must not be reached');
});
