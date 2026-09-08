import assert from 'node:assert/strict';
import test from 'node:test';
import {readToshiJson,toshiClientFingerprint,ToshiBodyLimitError} from './request-security';
import {createMemoryBudget,groqBudgetWindows} from './groq-budget';
import {createToshiRateLimiter} from './rate-limit';
test('oversized bodies with and without content length are rejected before parsing',async()=>{for(const headers of [new Headers(),new Headers({'content-length':'100'})]){await assert.rejects(()=>readToshiJson(new Request('http://test',{method:'POST',body:'x'.repeat(100),headers}),20),ToshiBodyLimitError);}});
test('valid JSON is decoded and spoofed UA/forwarded headers cannot rotate guest quota',async()=>{
 assert.deepEqual(await readToshiJson(new Request('http://test',{method:'POST',body:'{"a":1}'})),{a:1});
 assert.equal(toshiClientFingerprint(new Request('http://test',{headers:{'x-forwarded-for':'1.2.3.4','user-agent':'a'}}),''),toshiClientFingerprint(new Request('http://test',{headers:{'x-forwarded-for':'5.6.7.8','user-agent':'b'}}),''));
});
test('explicit ingress IP header requires a valid single IP',()=>{assert.equal(toshiClientFingerprint(new Request('http://test',{headers:{'x-real-ip':'forged, 1.2.3.4'}}),'x-real-ip'),toshiClientFingerprint(new Request('http://test'),'x-real-ip'));});
test('budget reservations are atomic: denied windows consume none of the other counters',async()=>{
 const take=createMemoryBudget(()=>0);const a={key:'a',limit:1,amount:1,ttl:60},b={key:'b',limit:1,amount:1,ttl:60};assert.equal(await take([a]),true);assert.equal(await take([a,b]),false);assert.equal(await take([b]),true);
});
test('parallel reservations respect the cap and expire',async()=>{let now=0;const take=createMemoryBudget(()=>now);const w={key:'x',limit:2,amount:1,ttl:1};assert.equal((await Promise.all([take([w]),take([w]),take([w])])).filter(Boolean).length,2);now=1001;assert.equal(await take([w]),true);});
test('global budget is shared across users while user quota contains no raw identity',()=>{const a=groqBudgetWindows('owner-secret',100,0),b=groqBudgetWindows('other',100,0);assert.equal(a[0].key,b[0].key);assert.notEqual(a.at(-1)?.key,b.at(-1)?.key);assert.ok(!JSON.stringify(a).includes('owner-secret'));});
test('rate limiter does not grow unlimited key entries',()=>{const limit=createToshiRateLimiter({limit:1,windowMs:1000,now:()=>0});for(let i=0;i<5000;i++)assert.equal(limit.consume(String(i)).allowed,true);assert.equal(limit.consume('overflow').allowed,false);});
