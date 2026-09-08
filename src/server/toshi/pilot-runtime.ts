import {isPilotAccount} from './pilot-access';
import {createHash,randomUUID} from 'node:crypto';
import {requireNativeCustomerPrincipal} from '../auth/native-auth/account';
import {NativeAuthError} from '../auth/native-auth/service';
import type {KesfetPublicBusiness} from '../repositories/businesses.types';
import type {ToshiChatRequest,ToshiChatReply} from './contracts';
import {create360DiscoveryTools,type DiscoverySavedContext} from './discovery';
import {runGroqDiscovery,GROQ_MODEL} from './groq';
import {runClosedCommands} from './command-engine';
import {budgetedGroqFetch} from './groq-budget';
import {guardUnconfirmedMessage} from './reply-safety';
const contexts=new Map<string,{city:string;saved:DiscoverySavedContext;expires:number}>();
export function createPilotRuntime(loadBusinesses:()=>Promise<readonly KesfetPublicBusiness[]>){
 return async(input:ToshiChatRequest,request:Request,fingerprint:string):Promise<ToshiChatReply>=>{
 const authorization=request.headers.get('authorization');
 const token=authorization?(/^Bearer\s+(\S+)$/i.exec(authorization)?.[1]??null):null;
 if(authorization&&!token)throw new NativeAuthError('INVALID_ACCESS_TOKEN',401);
 const owner=token?(await requireNativeCustomerPrincipal(token)).appUserId:null;
 const test=await isPilotAccount(owner);
 const enabled=process.env.TOSHI_360_DISCOVERY_ENABLED==='true'&&(test||process.env.TOSHI_360_PUBLIC_DISCOVERY_ENABLED==='true');
 const capabilities={discovery:enabled,personal:false,transactions:false};
 if(!enabled)return {message:'Merhaba! Toshi şu anda hazırlanıyor. Keşfet sayfasından yerleri inceleyebilirsin.',source:'rules',recommendations:[],capabilities};
 const scope=owner??'guest:'+fingerprint,conversationId=input.conversationId??randomUUID();
 const key=createHash('sha256').update(scope+':'+conversationId).digest('hex');
 for(const [id,value]of contexts)if(value.expires<=Date.now())contexts.delete(id);
 const previous=contexts.get(key);const saved=previous?.city===input.context.city?previous.saved:undefined;
 let loaded:Promise<readonly KesfetPublicBusiness[]>|undefined;
 const businesses=()=>loaded??=loadBusinesses();
 const tools=create360DiscoveryTools({loadBusinesses:businesses,
 loadEvents:async q=>{const {GET}=await import('../../app/api/kesfet/events/route');const url=new URL('https://tikprofil.internal/api/kesfet/events');url.searchParams.set('city',q.city);if(q.category)url.searchParams.set('category',q.category);if(q.date)url.searchParams.set('date',q.date);const r=await GET(new Request(url));if(!r.ok)throw Error('Event source unavailable');const p=await r.json();return p.data??p;},
 loadGuides:async()=>{const {GET}=await import('../../app/api/blog-posts/route');const url=new URL('https://tikprofil.internal/api/blog-posts');url.searchParams.set('city',input.context.city);const r=await GET(new Request(url));if(!r.ok)throw Error('Guide source unavailable');const p=await r.json();return Array.isArray(p.posts)?p.posts:[];},
 },{context:input.context,saved});
 const engine=process.env.TOSHI_GROQ_ENABLED==='true'&&process.env.GROQ_API_KEY?runGroqDiscovery:runClosedCommands;
 const reply=await engine({apiKey:process.env.GROQ_API_KEY??'',model:GROQ_MODEL,fetcher:budgetedGroqFetch(scope),onMetric:metric=>console.info('[Toshi]',metric)},{messages:input.messages,safetyIdentifier:'pilot',tools,instructions:'Yalnızca keşif pilotu. Kişisel veri veya işlem araçları yok. İşlem tamamlandı deme.'});
 if(contexts.size>=5000)contexts.delete(contexts.keys().next().value!);
 contexts.set(key,{city:input.context.city,saved:reply.context,expires:previous?.expires??Date.now()+86400000});
 const list=reply.cards.some(c=>c.kind==='business')?await businesses():[];
 const recommendations=reply.cards.filter(c=>c.kind==='business').flatMap(card=>{const b=list.find(b=>b.id===card.id);return b?[{id:b.id,slug:b.slug,name:b.name,categoryLabel:b.categoryLabel,city:b.city,district:b.district,coverImage:b.coverImage,logoUrl:null,distance:card.distanceKm??null,rating:b.rating,reviewCount:b.reviewCount,reason:''}]:[];});
 return {message:guardUnconfirmedMessage(reply.message),source:'source' in reply?reply.source as 'ai'|'rules'|'fallback':'rules',recommendations,cards:reply.cards.filter(c=>c.kind!=='business'),sources:reply.sources,conversationId,capabilities};
 };
}
