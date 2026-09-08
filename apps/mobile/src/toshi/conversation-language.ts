export type ConversationMessage = { role: string; content: string };
export const normalizeConversation = (value: string) => value.toLocaleLowerCase('tr-TR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/[!?.,;:]/g, ' ').replace(/\s+/g, ' ').trim();

/** Pick another authored response when the same intent repeats; never invent business facts. */
export function conversationalReply(messages: readonly ConversationMessage[]): string | null {
  const q = normalizeConversation(messages.filter(message => message.role === 'user').at(-1)?.content ?? '');
  const previous = messages.filter(message => message.role === 'assistant').at(-1)?.content;
  const choose = (options: string[]) => options.find(option => option !== previous) ?? options[0];
  const greeting = q.replace(/\b(toshi|dostum|dostun|kanka)\b/g, '').trim();
  if (/^(merhaba|merhabalar|selam|selamlar|hey|gunaydin|iyi aksamlar|iyi gunler)$/.test(greeting)) {
    return choose(['Merhaba! Bugün ne yapmak istersin?', 'Selam! Bir kahve molası mı, güzel bir yemek mi; bugün aklında ne var?', 'Merhaba, hoş geldin! Bir yer mi arıyoruz, biraz şehri mi keşfediyoruz?']);
  }
  if (/^(nasilsin|nasilsin toshi|ne haber|naber|merhaba nasilsin|selam nasilsin)$/.test(q)) return choose(['Buradayım, keşfe hazırım! Sen nasılsın?', 'Birlikte güzel bir yer bulmaya hazırım. Senin günün nasıl gidiyor?']);
  if (/^(tesekkurler|tesekkur ederim|sag ol|sagol|eyvallah|cok tesekkur ederim|super|harika)$/.test(q)) return choose(['Rica ederim! Başka bir şey ararsan buradayım.', 'Ne demek! Güzel vakit geçir.']);
  if (/^(gorusuruz|hosca kal|hoscakal|bay bay|iyi geceler)$/.test(q)) return 'Görüşürüz! Yeniden keşfetmek istediğinde buradayım.';
  if (/^(sen kimsin|kimsin|adin ne|sen nesin)$/.test(q)) return 'Ben Toshi, şehir asistanın. Uygulamadaki yerleri bulmana ve nereye gideceğine karar vermene yardımcı oluyorum.';
  if (/^(iyiyim|iyiyim sen|iyiyim tesekkurler|ben de iyiyim)$/.test(q)) return 'Güzel! Bugün için aklında bir plan var mı?';
  if (/^(canim sikiliyor|sikildim|ne yapsam|ne yapalim|kararsizim|bilmiyorum)$/.test(q)) return 'Birlikte seçelim. Bir şeyler yemek mi, kahve içmek mi, bir etkinliğe gitmek mi daha iyi gelir?';
  if (/^(tamam|peki|olur|evet)$/.test(q)) return 'Nasıl devam edelim? İstersen bir yer türü ya da önerilerden birinin adını yaz.';
  if (/^(anlamadin|beni anlamadin|cok robotsun|robot gibisin|sacma|olmadi)$/.test(q)) return 'İstediğini tam yakalayamadım. Nasıl bir yer arıyorsun; kahve, yemek ya da etkinlik mi?';
  return null;
}
