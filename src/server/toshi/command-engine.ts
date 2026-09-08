import { normalizeSearchText } from "../repositories/businesses.types";
import { conversationalReply } from "../../../apps/mobile/src/toshi/conversation-language";
import { SAFE_PREFERENCES } from "./personal/contracts";
import type { run360DiscoveryModel } from "./discovery/orchestrator";

type EngineInput=Parameters<typeof run360DiscoveryModel>[1];
type RecordValue=Record<string,unknown>;
const object=(v:unknown):RecordValue=>v&&typeof v==="object"&&!Array.isArray(v)?v as RecordValue:{};
const rows=(v:unknown):RecordValue[]=>Array.isArray(v)?v.map(object):[];
const text=(v:unknown)=>typeof v==="string"?v:"";
const HELP="İşletme, etkinlik ve rehber bulabilirim. Örneğin ‘kahve bul’, ‘ikincisini aç’, ‘menüsünü göster’, ‘favoriye ekle’ veya ‘puanımı göster’ yazabilirsin.";
const personalResources=[['puan','points'],['siparisler','orders'],['randevular','appointments'],['rezervasyonlar','reservations'],['favoriler','favorites'],['adresler','addresses']] as const;
const privateFields=/kart numar|sifre|parola|kimlik numar|konum gecmis|saglik bilg|hastalik|teshis|ilac/i;
/** Closed command interpreter. No network, model, evaluation prompt, or dynamic code execution. */
export async function runClosedCommands(_options:Parameters<typeof run360DiscoveryModel>[0], input:EngineInput) {
 const latest=input.messages.filter(m=>m.role==='user').at(-1)?.content.trim()??"";
 const q=normalizeSearchText(latest);
 const history=input.messages.filter(m=>m.role==='user').slice(-8).map(m=>m.content).join('\n');
 const measured=async(name:string,operation:()=>Promise<unknown>)=>{const started=Date.now();let success=false;try{const result=object(await operation());success=!result.status||['ready','awaiting-user','awaiting-confirmation'].includes(String(result.status));return result;}finally{try{_options.onMetric?.({kind:'tool',tool:name,durationMs:Date.now()-started,success});}catch{}}};
 const tool=async(name:string,args:unknown)=>measured(name,()=>input.tools.execute(name,args));
 const extra=async(name:string,args:unknown):Promise<RecordValue>=>input.extraTools?.definitions.some(d=>d.name===name)?measured(name,()=>input.extraTools!.execute(name,args)): {status:'disabled'};
 const finish=(message:string)=>({message,cards:input.tools.getCards().slice(0,8),sources:input.tools.getSources(),context:input.tools.getContext()});
 const failure=(r:RecordValue)=>r.status==='disabled'?"Bu işlem hesabın için henüz açık değil. Giriş durumunu ve ilgili uygulama ekranını kontrol edebilirsin.":r.status==='location-needed'?"Yakınlığı karşılaştırmak için konumuna ihtiyacım var. Konum iznini açabilir veya şehir üzerinden arayabilirsin.":r.status==='empty'?"Bu isteğe uygun kayıt bulamadım. Başka bir kategori veya yer deneyebilirsin.":r.status==='not-found'?"Hangi kaydı istediğini belirleyemedim. Önce bir sonuç seçebilir veya adını yazabilirsin.":"Bilgileri şu anda doğrulayamıyorum. İlgili uygulama ekranından devam edebilir veya yeniden deneyebilirsin.";
 const reference=()=>/\b(ikinci(?:si(?:ni)?)?|2)\b/.test(q)?'ikincisi':/\b(ucuncu(?:su(?:nu)?)?|3)\b/.test(q)?'üçüncüsü':/\b(ilk|birinci(?:si(?:ni)?)?|1)\b/.test(q)?'birincisi':input.tools.getContext().selectedId??'bu';
 const selected=async()=>{const r=await tool('select_result',{reference:reference()});const card=object(r.result);const href=text(card.href);return {r,card,slug:href.startsWith('/business/')?decodeURIComponent(href.slice('/business/'.length)):''};};
 const navigate=async(screen:string,message:string)=>{const r=await extra('open_app_screen',{screen});return finish(r.status==='disabled'?failure(r):message);};
 const prepare=async(kind:string,payload:RecordValue)=>{const r=await extra('prepare_action',{kind,payloadJson:JSON.stringify(payload)});return finish(r.status==='awaiting-confirmation'?"İşlem taslağını hazırladım. Bilgileri inceleyip onaylayabilirsin; henüz tamamlanmadı.":failure(r));};
 const social=conversationalReply(input.messages);
 if(social)return finish(social);
 if(/baska|alternatif|begenmedim|bunlar olmasin|farkli/.test(q)){
  const r=await tool('search_businesses',{query:latest,sort:'relevance'});
  return finish(r.status==='ready'?'Tamam, farklı seçeneklere bakalım. Bunlardan biri aklına yatıyor mu?':r.status==='empty'?'Bu aramada öncekilerden farklı bir yer bulamadım. Başka bir kategori deneyelim mi?':'Tabii. Ne için alternatif bakalım; kahve, yemek ya da başka bir şey mi?');
 }
 if(!q||/^(yardim|neler yapabilirsin|ne yapabiliyorsun)[!.? ]*$/.test(q))return finish(HELP);
 if(/hatir|hafiza|unut/.test(q)){
  if(privateFields.test(q))return finish("Hassas bilgileri hafızama kaydetmiyorum. Güvenli tercihlerini hafıza ekranından yönetebilirsin.");
  if(/unut|sil|goster|neler|hatirladik/.test(q))return navigate('memory',"Hatırladığım tercihleri bu ekrandan görebilir, düzenleyebilir ve silebilirsin.");
  const candidates=SAFE_PREFERENCES.filter(p=>{const words=normalizeSearchText(p).replace('secenekleri tercih ederim','').replace('mekanlarini tercih ederim','').replace('mekanlari tercih ederim','').replace('isletmeleri tercih ederim','').trim();return q.includes(words);});
  const mapped=candidates.length===1?candidates[0]:/sessiz/.test(q)?SAFE_PREFERENCES[2]:/vejetaryen/.test(q)?SAFE_PREFERENCES[0]:/vegan/.test(q)?SAFE_PREFERENCES[1]:/uygun fiyat|butce/.test(q)?SAFE_PREFERENCES[4]:/aile/.test(q)?SAFE_PREFERENCES[5]:/kahve/.test(q)?SAFE_PREFERENCES[9]:null;
  if(!mapped)return navigate('memory',"Kaydedebileceğim tercihleri buradan seçebilirsin.");
  const r=await extra('suggest_memory',{content:mapped});return finish(r.status==='awaiting-user'?"Bu tercihi kaydetmek için aşağıdaki ekrandan onaylayabilirsin.":failure(r));
 }
 if(/profil.*foto|fotograf.*degistir|avatar/.test(q))return navigate('avatar',"Profil fotoğrafını bu ekrandan kendin seçebilirsin.");
 const name=latest.match(/(?:adımı|adimi|profil adımı|profil adimi)\s+[“"']?(.{2,80}?)[”"']?\s+(?:yap|değiştir|degistir|olarak güncelle)[.!]?$/iu);
 if(name)return prepare('profile.update',{displayName:name[1].trim()});
 if(/adres.*(degistir|duzenle|sil|kaydet|ekle|varsayilan)|profil.*(duzenle|degistir)/.test(q))return navigate(q.includes('adres')?'addresses':'profile',"Değiştirmek istediğin bilgileri bu ekrandan seçip kontrol edebilirsin.");
 for(const [match,resource] of personalResources){if(q.includes(match)&&!/(ekle|cikar|sil|iptal|ayirt)/.test(q)){
  const r=await extra('read_my_data',{resource});if(r.status!=='ready')return finish(failure(r));
  const data=r.data;if(resource==='points'){const d=object(data);const balance=typeof d.balance==='number'?d.balance:object(d.summary).balance;return finish(typeof balance==='number'?`Tık Puan bakiyen ${balance}. Güncel ayrıntıları profilinden görebilirsin.`:"Puan ayrıntılarını şu anda doğrulayamıyorum.");}
  const values=rows(data);if(!values.length)return finish("Bu bölümde kayıt bulamadım.");
  return finish(values.slice(0,6).map((v,i)=>`${i+1}. ${text(v.businessName)||text(v.label)||text(v.businessSlug)||'Kayıt'}${v.status?' · '+statusLabel(v.status):''}${typeof v.total==='number'?' · '+v.total+' TL':''}`).join('\n'));
 }}
 if(/favori.*(ekle|kaydet|cikar|sil)|kaydet.*favori/.test(q)){
  const s=await selected();if(!s.slug)return finish(failure(s.r));return prepare(/cikar|sil/.test(q)?'favorite.remove':'favorite.add',{businessSlug:s.slug});
 }
 if(/(rezervasyon|randevu).*iptal/.test(q)){
  const resource=q.includes('randevu')?'appointments':'reservations',r=await extra('read_my_data',{resource});if(r.status!=='ready')return finish(failure(r));
  const records=rows(r.data),index=reference()==='ikincisi'?1:reference()==='üçüncüsü'?2:reference()==='birincisi'?0:records.length===1?0:-1;
  if(index<0||!records[index])return finish("İptal etmek istediğin kaydı belirt: ‘ilk randevumu iptal et’ gibi yazabilirsin.");
  const record=records[index];if(record.cancellable!==true)return finish("Bu kayıt şu anda iptal edilemiyor.");return prepare(resource==='appointments'?'appointment.cancel':'reservation.cancel',{id:record.id});
 }
 if(/sepete|sepet hazirla|siparis hazirla/.test(q)){
  const menu=await tool('get_menu',{reference:input.tools.getContext().selectedId??'bu'});if(menu.status!=='ready')return finish(failure(menu));
  const items=rows(menu.items),matches=items.filter(p=>q.includes(normalizeSearchText(text(p.name))));
  const index=/ikinci/.test(q)?1:/ilk|birinci/.test(q)?0:-1;const product=matches.length===1?matches[0]:index>=0?items[index]:undefined;
  if(!product)return finish("Sepete hazırlamam için ürün adını ve adedini yaz. Örneğin ‘2 adet Klasik Burger sepete hazırla’.");
  const quantity=Number(q.match(/\b(\d{1,2})\s*(?:adet|tane)/)?.[1]??1);const href=text(object(menu.result).href);
  if(!href.startsWith('/business/'))return finish("Önce işletmeyi seçmelisin.");
  return prepare('checkout.handoff',{businessSlug:decodeURIComponent(href.slice(10)),items:[{productId:product.id,quantity}]});
 }
 if(/rezervasyon|randevu|masa ayirt/.test(q)){
  const kind=q.includes('randevu')?'appointment':'reservation';const s=await selected();if(!s.slug)return finish("Önce rezervasyon veya randevu istediğin işletmeyi seç. İşletme adını arayabilirim.");
  const r=await extra('get_booking_options',{kind,businessSlug:s.slug});if(r.status!=='ready')return finish(failure(r));const data=object(r.data);
  if(data.nativeEnabled!==true)return finish("Bu işletmede uygulama içinden bu işlem desteklenmiyor. Profilindeki iletişim seçeneklerini kullanabilirsin.");
  const choices=rows(kind==='appointment'?data.services:data.resources),staff=rows(data.staff);
  const named=choices.filter(c=>normalizeSearchText(history).includes(normalizeSearchText(text(c.name))));const choice=named.length===1?named[0]:choices.length===1?choices[0]:undefined;
  const slots=parseBookingFields(history);const missing:string[]=[];
  if(!choice)missing.push('hizmet/seçim ('+choices.slice(0,5).map(c=>text(c.name)).join(', ')+')');
  if(!slots.date)missing.push('tarih (YYYY-AA-GG)');if(!slots.time)missing.push('saat (SS:DD)');if(!slots.customerName)missing.push('ad soyad (Ad: ...)');if(!slots.customerPhone)missing.push('telefon (Telefon: ...)');
  const person=staff.find(p=>normalizeSearchText(history).includes(normalizeSearchText(text(p.name))))??(staff.length===1?staff[0]:undefined);
  if(kind==='appointment'&&!person)missing.push('personel ('+staff.slice(0,5).map(c=>text(c.name)).join(', ')+')');
  if(kind==='reservation'&&data.vertical==='restaurant'&&!slots.partySize)missing.push('kişi sayısı');
  if(kind==='reservation'&&data.vertical!=='restaurant'&&!slots.endDate)missing.push('bitiş tarihi (Bitiş: YYYY-AA-GG)');
  if(missing.length)return finish('Taslağı hazırlamak için '+missing.join('; ')+' bilgisi gerekiyor. Sonraki mesajına “'+(kind==='appointment'?'randevu':'rezervasyon')+'” yazarak ekleyebilirsin.');
  return prepare(kind+'.create',kind==='appointment'?{businessSlug:s.slug,serviceId:choice!.id,staffId:person!.id,date:slots.date,time:slots.time,customerName:slots.customerName,customerPhone:slots.customerPhone}:{businessSlug:s.slug,resourceId:choice!.id,vertical:data.vertical,startDate:slots.date,endDate:slots.endDate??slots.date,time:slots.time,partySize:slots.partySize,customerName:slots.customerName,customerPhone:slots.customerPhone});
 }
 if(/menu|menusu/.test(q)){
  const r=await tool('get_menu',{reference:reference()});if(r.status!=='ready')return finish(failure(r));return finish(rows(r.items).slice(0,12).map((p,i)=>`${i+1}. ${text(p.name)}${typeof p.price==='number'?' · '+p.price+' TL':''}`).join('\n')||"Menüde ürün bulunamadı.");
 }
 if(/yol tarifi|nasil giderim/.test(q)){const r=await tool('get_route',{reference:reference()});return finish(r.status==='ready'?"Seçtiğin yerin sayfasındaki konum ve yol tarifi seçeneklerini açabilirsin.":failure(r));}
 if(/\b(ikinci(?:si(?:ni)?)?|ucuncu(?:su(?:nu)?)?|birinci(?:si(?:ni)?)?|ilk)\b.*(ac|sec|olsun)|^(ikincisi|ucuncusu|birincisi|bu olsun)[.! ]*$/.test(q)){const r=await tool('select_result',{reference:reference()});return finish(r.status==='ready'?text(object(r.result).title)+" için sayfayı açabilirsin.":failure(r));}
 if(/kategori/.test(q)){const r=await tool('list_categories',{});return finish(r.status==='ready'?"Kategorilerden birini seçebilirsin.":failure(r));}
 if(/sinema|film|konser|tiyatro|etkinlik|ailece.*(hafta|plan|yap)/.test(q)){
  const category=/sinema|film/.test(q)?'sinema':q.includes('tiyatro')?'tiyatro':q.includes('konser')?'konser':/cocuk|aile/.test(q)?'cocuk':null;
  const date=latest.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0]??null;const r=await tool('search_events',{category,date});return finish(r.status==='ready'&&!r.stale?(rows(r.results).length?"Yayımlanmış programdan bulduğum seçenekler bunlar. Gün ve seans ayrıntılarını etkinlik sayfasından kontrol edebilirsin.":"Bu tarih ve kategori için etkinlik bulamadım."):r.stale?"Etkinlik verisi eski olabilir. Güncel programı doğrulayamıyorum.":failure(r));
 }
 if(/rehber|gezi|gezilecek|rota|sehri kesfet/.test(q)){const r=await tool('search_guides',{reference:'rehber'});return finish(r.status==='ready'?"Şehir rehberleri ve rotalar burada.":failure(r));}
 if(/hava|ulasim duyuru|resmi kaynak|internet|web ara/.test(q))return finish("Kapalı komut sisteminde internet araştırması yapmıyorum. Uygulamadaki rehber ve etkinlik kayıtlarını gösterebilirim.");
 if(/kahve|kafe|yemek|burger|pizza|doner|cig kofte|eczane|veteriner|otel|kuafor|restoran|isletme|yakin|ailece|kesfet|ara|bul/.test(q)){
  const r=await tool('search_businesses',{query:latest,sort:/daha yakin/.test(q)?'distance':'relevance'});return finish(r.status==='ready'?"Uygulamadaki kayıtlar arasından bu seçenekleri buldum. Ayrıntılarını açabilirsin.":failure(r));
 }
 if(/profil|hesabim/.test(q))return navigate('profile',"Profilini bu ekrandan yönetebilirsin.");
 return finish("Bu isteği bir komutla eşleştiremedim. "+HELP);
}
function statusLabel(v:unknown){return ({pending:'Onay bekliyor',confirmed:'Onaylandı',cancelled:'İptal edildi',completed:'Tamamlandı',rejected:'Reddedildi'} as Record<string,string>)[text(v)]??'Durumu ilgili ekrandan kontrol et';}
export function parseBookingFields(history:string){
 const date=history.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0];
 const endDate=history.match(/(?:Bitiş|Bitis):\s*(\d{4}-\d{2}-\d{2})/iu)?.[1];
 const time=history.match(/\b([01]\d|2[0-3]):([0-5]\d)\b/)?.[0];
 const customerName=history.match(/(?:Ad|İsim|Isim):\s*([^\n;\d]{2,100})/iu)?.[1]?.trim();
 const customerPhone=history.match(/(?:Telefon|Tel):\s*(\+?[\d ()-]{10,22})/iu)?.[1]?.trim();
 const partySize=Number(history.match(/\b(\d{1,2})\s*kişi/iu)?.[1]??0)||undefined;
 return{date,endDate,time,customerName,customerPhone,partySize};
}
