/* eslint-disable @typescript-eslint/no-require-imports -- Database-free unit tests via tsx. */
const test=require('node:test'),assert=require('node:assert/strict');
const {validateUsage,saveBaker,BakerError}=require('../lib/baker-service.ts');
const {condition}=require('../app/baker/data.ts');
const base=()=>({token:'abcdef012345678',productId:'OUT01',output:'2',status:'Selesai',reason:'',lines:[{itemId:'MAT01',batchId:'batch001',unit:'kg',amount:'1.25'}]});
test('quantities reject negative, zero, excess precision, non-finite and capacity overflow',()=>{
 for(const value of ['-1','0','1.001','100000000','NaN','Infinity','1e2','']){
  assert.throws(()=>validateUsage({...base(),output:value}),BakerError);
  assert.throws(()=>validateUsage({...base(),lines:[{...base().lines[0],amount:value}]}),BakerError);
 }
 assert.equal(validateUsage(base()).lines[0].amount.toString(),'1.25');
});
test('failed production requires zero result and reason; success cannot carry failure reason',()=>{
 assert.throws(()=>validateUsage({...base(),status:'Gagal',output:'1',reason:'Failure'}),BakerError);
 assert.throws(()=>validateUsage({...base(),status:'Gagal',output:'0',reason:''}),BakerError);
 assert.throws(()=>validateUsage({...base(),reason:'Failure'}),BakerError);
 assert.equal(validateUsage({...base(),status:'Gagal',output:'0',reason:'Failure'}).output.toString(),'0');
});
test('batch identity, duplicate batches, missing lines and malformed runtime payloads are rejected',()=>{
 for(const payload of [null,{}, {...base(),lines:[]},{...base(),token:'bad'},{...base(),lines:[null]},{...base(),lines:[...base().lines,...base().lines]},{...base(),lines:[{...base().lines[0],batchId:''}]},{...base(),lines:Array.from({length:51},(_,i)=>({...base().lines[0],batchId:'batch'+i}))}])assert.throws(()=>validateUsage(payload),BakerError);
});
test('invalid input fails before a database transaction starts',async()=>{
 let reached=false;const client={$transaction(){reached=true;throw new Error('Forbidden database');}};
 await assert.rejects(saveBaker(client,{}, {...base(),output:'-1'}),BakerError);assert.equal(reached,false);
});
test('stock condition uses actual stock/minimum with no special-case material IDs',()=>{
 assert.equal(condition({id:'susu',stock:10,minimum:5}),'Aman');
 assert.equal(condition({id:'any',stock:0,minimum:0}),'Habis');
 assert.equal(condition({stock:1,minimum:6}),'Kritis');
 assert.equal(condition({stock:4,minimum:6}),'Menipis');
});
