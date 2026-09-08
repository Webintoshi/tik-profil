import assert from 'node:assert/strict';
import test from 'node:test';
import {createPilotRuntime} from './pilot-runtime';
import {parseToshiChatRequest} from './contracts';
const input=()=>parseToshiChatRequest({protocolVersion:2,messages:[{role:'user',content:'Merhaba'}],context:{city:'Ordu',radiusKm:3}});
test('rejects a malformed bearer before enabling discovery',async()=>{
 const run=createPilotRuntime(async()=>{throw Error('Must not load records');});
 await assert.rejects(()=>run(input(),new Request('https://example.test',{headers:{authorization:'Bearer'}}),'guest'),e=>typeof e==='object'&&e!==null&&'statusCode' in e&&e.statusCode===401);
});
test('disabled pilot does not load businesses or grant personal capabilities',async()=>{
 const previous=process.env.TOSHI_360_DISCOVERY_ENABLED;process.env.TOSHI_360_DISCOVERY_ENABLED='false';
 try {const reply=await createPilotRuntime(async()=>{throw Error('Must not load records');})(input(),new Request('https://example.test'),'guest');
 assert.deepEqual(reply.capabilities,{discovery:false,personal:false,transactions:false});assert.equal(reply.source,'rules');}
 finally {if(previous===undefined)delete process.env.TOSHI_360_DISCOVERY_ENABLED;else process.env.TOSHI_360_DISCOVERY_ENABLED=previous;}
});
