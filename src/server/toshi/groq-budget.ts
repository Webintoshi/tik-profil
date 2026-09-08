import {createHash} from 'node:crypto';
import {createClient} from 'redis';
export type BudgetWindow={key:string;limit:number;amount:number;ttl:number};
export const BUDGET_LUA=`
for i,key in ipairs(KEYS) do
 if tonumber(redis.call('GET',key) or '0') + tonumber(ARGV[(i-1)*3+1]) > tonumber(ARGV[(i-1)*3+2]) then return 0 end
end
for i,key in ipairs(KEYS) do
 redis.call('INCRBY',key,ARGV[(i-1)*3+1])
 redis.call('EXPIRE',key,ARGV[(i-1)*3+3])
end
return 1`;
export function createMemoryBudget(now=Date.now){
 const counters=new Map<string,{value:number;expires:number}>();
 return async(windows:BudgetWindow[])=>{
 for(const [key,row]of counters)if(row.expires<=now())counters.delete(key);
 if(counters.size>5000)return false;
 if(windows.some(w=>(counters.get(w.key)?.value??0)+w.amount>w.limit))return false;
 for(const w of windows)counters.set(w.key,{value:(counters.get(w.key)?.value??0)+w.amount,expires:now()+w.ttl*1000});return true;
 };
}
const memory=createMemoryBudget();
let client:ReturnType<typeof createClient>|undefined;
let connecting:Promise<unknown>|undefined;
async function reserve(windows:BudgetWindow[]):Promise<boolean>{
 if(!process.env.REDIS_URL){if(process.env.NODE_ENV==='production')return false;return memory(windows);}
 try{
 if(!client){client=createClient({url:process.env.REDIS_URL,socket:{connectTimeout:800,reconnectStrategy:false},disableOfflineQueue:true});client.on('error',()=>{});}
 if(!client.isReady){connecting??=client.connect().finally(()=>{connecting=undefined;});await connecting;}
 return (await client.eval(BUDGET_LUA,{keys:windows.map(w=>w.key),arguments:windows.flatMap(w=>[String(w.amount),String(w.limit),String(w.ttl)])}))===1;
 }catch{return false;}
}
export function groqBudgetWindows(owner:string,inputBytes:number,now=Date.now()):BudgetWindow[]{
 const id=createHash('sha256').update(owner).digest('hex').slice(0,32),day=Math.floor(now/86400000),minute=Math.floor(now/60000),hour=Math.floor(now/3600000);
 return [
 {key:`toshi:groq:minute:${minute}`,limit:20,amount:1,ttl:120},
 {key:`toshi:groq:day:${day}`,limit:800,amount:1,ttl:172800},
 {key:`toshi:groq:tokens:${day}`,limit:180000,amount:inputBytes+1200,ttl:172800},
 {key:`toshi:groq:user:${id}:${hour}`,limit:20,amount:1,ttl:7200},
 ];
}
let inFlight=0;
export function budgetedGroqFetch(owner:string,fetcher:typeof fetch=fetch):typeof fetch{
 return async(url,init)=>{
 if(inFlight>=2)throw Error('Groq concurrency limit');inFlight++;
 try{
 // Byte length is a conservative input token reservation. No refunds after uncertain requests.
 const body=JSON.parse(String(init?.body));const inputBytes=Buffer.byteLength(JSON.stringify({messages:body.messages,tools:body.tools}));
 let timer:ReturnType<typeof setTimeout>|undefined;
 const allowed=await Promise.race([reserve(groqBudgetWindows(owner,inputBytes)),new Promise<boolean>(resolve=>{timer=setTimeout(()=>resolve(false),1200);})]).finally(()=>clearTimeout(timer));
 if(!allowed)throw Error('Groq budget unavailable');
 return await fetcher(url,{...init,redirect:'error'});
 }finally{inFlight--;}
 };
}
