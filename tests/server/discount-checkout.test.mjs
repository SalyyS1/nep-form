import test from 'node:test';
import assert from 'node:assert/strict';
import { setup, product, address, cart, register, adminLogin } from './test-helpers.mjs';
import { activeSalePrice, productPrice } from '../../shared/product-pricing.mjs';
import { validateProduct } from '../../server/product-validation.mjs';
import { orderEmail } from '../../server/email-templates.mjs';
import { customSummary } from '../../server/custom-summary.mjs';
import { calculateCustomPrice, DEFAULT_PRICING } from '../../shared/custom-core.mjs';

test('sale price windows are inclusive/exclusive and clearable without changing normal prices', () => {
  const source={...product,salePrice:200000,saleStartsAt:'2026-10-20T01:00:00Z',saleEndsAt:'2026-10-20T02:00:00Z'};
  const value=validateProduct(source);
  assert.equal(productPrice(value,Date.parse('2026-10-20T00:59:59Z')),250000);
  assert.equal(productPrice(value,Date.parse(value.saleStartsAt)),200000);
  assert.equal(productPrice(value,Date.parse(value.saleEndsAt)),250000);
  assert.equal(activeSalePrice(validateProduct({...value,salePrice:null}),Date.parse(value.saleStartsAt)),null);
  for(const salePrice of [0,250000,250001,1.5])assert.throws(()=>validateProduct({...source,salePrice}));
  assert.throws(()=>validateProduct({...source,saleStartsAt:'2026-10-20T03:00:00Z'}));
  assert.throws(()=>validateProduct({...source,saleStartsAt:'2026-10-20T01:00'}));
});

test('custom sale discounts only garment price and preserves printing surcharge', async () => {
  const project={name:'Chữ riêng',productId:'blank',faces:{front:{layers:[{id:'text',type:'text',text:'Nếp',fontFamily:'Be Vietnam Pro',fontSize:32,x:20,y:20,width:100,height:50,color:'#000000',rotation:0}]},back:{layers:[]}}};
  const design={id:'design',userId:'owner',project};
  const store={get:async(kind)=>kind==='design'?design:null};
  const blank={id:'blank',price:200000,salePrice:150000};
  const summary=await customSummary(store,'design','owner',blank);
  const base=calculateCustomPrice(project,blank.price,DEFAULT_PRICING);
  assert.equal(summary.surcharge,base.surcharge);
  assert.equal(summary.unitPrice,base.unitPrice-50000);
});

test('checkout stacks sale + coupon, atomically races last use, rejects tampering and releases on both cancellations', async t => {
  const fixture=await setup(t), admin=fixture.client(), alice=fixture.client(), bob=fixture.client();
  await adminLogin(admin);await register(alice,'sale-a@example.test');await register(bob,'sale-b@example.test');
  const changed=await admin('/api/admin/products/shirt','PATCH',{salePrice:200000,expectedVersion:1});assert.equal(changed.status,200);
  const promotion=await admin('/api/admin/promotions','POST',{code:'NEP25',label:'Mừng áo mới',type:'percent',value:25,minSubtotal:100000,maxDiscount:30000,usageLimit:1,perUserLimit:1});
  assert.equal(promotion.status,200);
  await alice('/api/cart','POST',cart(1));await bob('/api/cart','POST',cart(1));
  const qa=(await alice('/api/checkout/quote','POST',{couponCode:'nep25'})).data.quote;
  const qb=(await bob('/api/checkout/quote','POST',{couponCode:'NEP25'})).data.quote;
  assert.equal(qa.subtotal,200000);assert.equal(qa.discount,30000);assert.equal(qa.total,200000);assert.equal(qa.shipping,30000);
  const payloadA={address,paymentMethod:'cod',idempotencyKey:'sale-alice',couponCode:'NEP25',expectedQuote:qa};
  const payloadB={address,paymentMethod:'cod',idempotencyKey:'sale-bob',couponCode:'NEP25',expectedQuote:qb};
  const tampered=await alice('/api/orders','POST',{...payloadA,expectedQuote:{...qa,discount:100000,total:130000}});
  assert.equal(tampered.status,409);assert.equal(tampered.data.code,'CART_CHANGED');
  assert.equal((await admin('/api/admin/promotions')).data.promotions[0].usedCount,0);
  const outcomes=await Promise.all([alice('/api/orders','POST',payloadA),bob('/api/orders','POST',payloadB)]);
  assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409]);
  const winnerIndex=outcomes.findIndex(r=>r.status===200),winner=[alice,bob][winnerIndex],loser=[alice,bob][1-winnerIndex];
  const winningPayload=[payloadA,payloadB][winnerIndex];const order=outcomes[winnerIndex].data.order;
  assert.equal(order.discount,30000);assert.equal(order.coupon.code,'NEP25');assert.equal(order.items[0].unitPrice,200000);
  const repeated=await winner('/api/orders','POST',winningPayload);assert.equal(repeated.data.order.id,order.id);
  assert.equal((await admin('/api/admin/promotions')).data.promotions[0].usedCount,1);
  const receipt=orderEmail(order,'receipt','https://shop.example.test');assert.match(receipt.text,/NEP25/);assert.match(receipt.text,/Giảm giá/);
  assert.equal((await winner(`/api/orders/${order.id}/cancel`,'POST')).status,200);
  assert.equal((await winner(`/api/orders/${order.id}/cancel`,'POST')).status,200);
  assert.equal((await admin('/api/admin/promotions')).data.promotions[0].usedCount,0);
  const nextQuote=(await loser('/api/checkout/quote','POST',{couponCode:'NEP25'})).data.quote;
  const next=(await loser('/api/orders','POST',{...winningPayload,idempotencyKey:'sale-next',expectedQuote:nextQuote})).data.order;
  assert.ok(next.id);
  assert.equal((await admin(`/api/admin/orders/${next.id}`,'PATCH',{status:'cancelled',expectedVersion:1})).status,200);
  assert.equal((await admin('/api/admin/promotions')).data.promotions[0].usedCount,0);
  assert.equal((await admin('/api/admin')).data.products[0].stock,3);
});

test('stale sale/coupon quotes never alter stock, cart or usage and old order totals stay immutable', async t => {
  const fixture=await setup(t), admin=fixture.client(), buyer=fixture.client();await adminLogin(admin);await register(buyer,'stale-sale@example.test');
  await buyer('/api/cart','POST',cart(1));
  const old=(await buyer('/api/checkout/quote','POST',{})).data.quote;
  await admin('/api/admin/products/shirt','PATCH',{salePrice:200000,expectedVersion:1});
  const rejected=await buyer('/api/orders','POST',{address,paymentMethod:'cod',idempotencyKey:'old-sale',expectedQuote:old});assert.equal(rejected.status,409);
  assert.equal((await buyer('/api/bootstrap')).data.cart.length,1);
  const promo=(await admin('/api/admin/promotions','POST',{code:'FIXED',label:'Giảm cố định',type:'fixed',value:20000})).data;
  const quote=(await buyer('/api/checkout/quote','POST',{couponCode:'FIXED'})).data.quote;
  await admin(`/api/admin/promotions/${promo.id}`,'PATCH',{value:10000,expectedVersion:1});
  const changed=await buyer('/api/orders','POST',{address,paymentMethod:'cod',couponCode:'FIXED',idempotencyKey:'old-coupon',expectedQuote:quote});assert.equal(changed.status,409);
  const current=(await buyer('/api/checkout/quote','POST',{couponCode:'FIXED'})).data.quote;
  const bought=await buyer('/api/orders','POST',{address,paymentMethod:'cod',couponCode:'FIXED',idempotencyKey:'final-coupon',expectedQuote:current});assert.equal(bought.status,200);
  const snapshot=bought.data.order;
  const nowProduct=(await admin('/api/admin')).data.products[0];
  await admin('/api/admin/products/shirt','PATCH',{salePrice:null,expectedVersion:nowProduct.version});
  assert.deepEqual((await buyer(`/api/orders/${snapshot.id}`)).data.order,snapshot);
  await fixture.restart();assert.deepEqual((await buyer('/api/auth/login','POST',{email:'stale-sale@example.test',password:'Customer@2026!'})).status,200);
  assert.deepEqual((await buyer(`/api/orders/${snapshot.id}`)).data.order,snapshot);
});
