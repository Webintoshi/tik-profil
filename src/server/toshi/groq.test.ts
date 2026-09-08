import assert from 'node:assert/strict';
import test from 'node:test';
import {runGroqDiscovery,createGroqTransport,GROQ_MODEL} from './groq';
import {create360DiscoveryTools} from './discovery';
const input=(content='Merhaba')=>({messages:[{role:'user' as const,content}],safetyIdentifier:'private-owner-id',tools:create360DiscoveryTools({loadBusinesses:async()=>[]},{context:{city:'Ordu',radiusKm:1}})});
const call=(name:string,args:unknown,id='one')=>Response.json({choices:[{message:{tool_calls:[{id,type:'function',function:{name,arguments:JSON.stringify(args)}}]},finish_reason:'tool_calls'}],usage:{prompt_tokens:100,completion_tokens:20}});
test('Groq request uses fixed provider URL, bounded output and no private tools or owner identity',async()=>{
 let body:any;let url='';
 const reply=await runGroqDiscovery({apiKey:'test-key',fetcher:async(u,i)=>{url=String(u);body=JSON.parse(String(i?.body));assert.equal(new Headers(i?.headers).get('authorization'),'Bearer test-key');return call('submit_discovery_reply',{message:'Merhaba! Bugün aklında ne var?',cardIds:[]});}}, {...input(),extraTools:{definitions:[{type:'function',name:'prepare_action',description:'private',parameters:{},strict:true}],execute:async()=>{throw Error('Forbidden');}}});
 assert.equal(url,'https://api.groq.com/openai/v1/chat/completions');assert.equal(body.model,GROQ_MODEL);assert.equal(body.parallel_tool_calls,false);assert.equal(body.max_completion_tokens,1200);assert.equal(reply.source,'ai');assert.ok(!JSON.stringify(body).includes('private-owner-id'));assert.ok(!body.tools.some((t:any)=>t.function.name==='prepare_action'));
});
test('429 and provider failures use existing safe rules with truthful source',async()=>{for(const status of [429,500,401]){const reply=await runGroqDiscovery({apiKey:'test',fetcher:async()=>new Response(null,{status})},input());assert.equal(reply.source,'fallback');assert.match(reply.message,/Merhaba/);}});
test('explicit supported commands use zero model calls',async()=>{const reply=await runGroqDiscovery({apiKey:'test',fetcher:async()=>{throw Error('No network');}},input('yardım'));assert.equal(reply.source,'rules');});
test('unknown returned card IDs cannot manufacture recommendation cards',async()=>{const reply=await runGroqDiscovery({apiKey:'test',fetcher:async()=>call('submit_discovery_reply',{message:'Birlikte bakalım.',cardIds:['invented']})},input());assert.deepEqual(reply.cards,[]);});
test('discovery answer cannot skip source read and repeated attempts remain bounded',async()=>{let count=0;const reply=await runGroqDiscovery({apiKey:'test',fetcher:async()=>{count++;return call('submit_discovery_reply',{message:'Sahte işletme',cardIds:[]});}},input('Kahve bul'));assert.equal(count,3);assert.equal(reply.source,'fallback');assert.doesNotMatch(reply.message,/Sahte/);});
test('tool calls and outputs translate across rounds preserving IDs',async()=>{
 const seen:any[]=[];await runGroqDiscovery({apiKey:'test',fetcher:async(_,init)=>{seen.push(JSON.parse(String(init?.body)));return seen.length===1?call('search_businesses',{query:'kahve',sort:'relevance'},'lookup'):call('submit_discovery_reply',{message:'Uygun kayıt yok.',cardIds:[]});}},input('Kahve bul'));
 assert.equal(seen.length,2);assert.equal(seen[1].messages.at(-1).role,'tool');assert.equal(seen[1].messages.at(-1).tool_call_id,'lookup');
});
test('invalid or truncated provider output never becomes a fake assistant reply',async()=>{
 const reply=await runGroqDiscovery({apiKey:'test',fetcher:async()=>Response.json({choices:[{finish_reason:'length',message:{content:'incomplete'}}]})},input());assert.equal(reply.source,'fallback');
});

test('natural chat text is accepted while the orchestrator still validates grounding',async()=>{
 const reply=await runGroqDiscovery({apiKey:'test',fetcher:async()=>Response.json({choices:[{finish_reason:'stop',message:{content:'Merhaba! Birlikte bir plan yapalım mı?'}}]})},input());assert.equal(reply.source,'ai');assert.equal(reply.cards.length,0);
});
