import assert from 'node:assert/strict';
import test from 'node:test';
import {isPilotAccount} from './pilot-access';
const env={TOSHI_360_TEST_ACCOUNT_EMAILS:'pilot@example.test'};
test('guests cannot gain access with an email allowlist',async()=>{
 assert.equal(await isPilotAccount(null,env,async()=>{throw Error('must not query');}),false);
});
test('only verified server account email grants access',async()=>{
 assert.equal(await isPilotAccount('owner',env,async id=>{assert.equal(id,'owner');return {email:'PILOT@example.test',verified:true};}),true);
 assert.equal(await isPilotAccount('owner',env,async()=>({email:'pilot@example.test',verified:false})),false);
 assert.equal(await isPilotAccount('owner',env,async()=>({email:'someone@example.test',verified:true})),false);
 assert.equal(await isPilotAccount('owner',env,async()=>null),false);
});
test('existing ID allowlist and disabled email list do not query accounts',async()=>{
 const noRead=async()=>{throw Error('must not query');};
 assert.equal(await isPilotAccount('owner',{TOSHI_360_TEST_ACCOUNT_IDS:'owner'},noRead),true);
 assert.equal(await isPilotAccount('owner',{},noRead),false);
});
