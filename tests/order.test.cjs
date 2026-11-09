/* eslint-disable @typescript-eslint/no-require-imports -- Unit tests use the server-only order validator through React's server condition. */
const test=require('node:test'),assert=require('node:assert/strict');
const {validateOrder,OrderError}=require('../lib/order-service.ts');
const valid={requestId:'0123456789abcde',supplierId:'SUP001',orderDate:'2026-11-09',estimatedDate:'2026-11-12',lines:[{itemId:'MAT001',quantity:'12.50',price:'15000'}]};
test('valid order accepts schema precision and serializes decimal values',()=>{
 const result=validateOrder({...valid,lines:[{...valid.lines[0],quantity:'99999999.99',price:'9999999999.99'}]});
 assert.equal(result.lines[0].quantity,'99999999.99');assert.equal(result.lines[0].price,'9999999999.99');
});
test('order validation rejects dates, zero/negative/overprecision values and duplicate items',()=>{
 for(const patch of [{orderDate:'2026-02-30'},{estimatedDate:'2026-11-08'},{lines:[]},{lines:[{...valid.lines[0],quantity:'0'}]},{lines:[{...valid.lines[0],quantity:'-1'}]},{lines:[{...valid.lines[0],quantity:'1.001'}]},{lines:[{...valid.lines[0],price:'0'}]},{lines:[{...valid.lines[0],price:'10000000000'}]},{lines:[valid.lines[0],valid.lines[0]]}]) assert.throws(()=>validateOrder({...valid,...patch}),OrderError);
});
test('untrusted shapes and IDs are rejected',()=>{
 for(const input of [null,[],{...valid,requestId:'bad'},{...valid,supplierId:'supplier-too-long'},{...valid,lines:[{...valid.lines[0],itemId:'bad/id'}]}]) assert.throws(()=>validateOrder(input),OrderError);
});
