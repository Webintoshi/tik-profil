export function guardUnconfirmedMessage(message:string):string {
 const normalized=message.toLocaleLowerCase("tr-TR");
 return /(?:sipariş(?:in|iniz)? (?:verildi|oluşturuldu|alındı)|rezervasyon(?:un|unuz)? (?:yapıldı|onaylandı|oluşturuldu)|randevu(?:n|nuz)? (?:alındı|oluşturuldu|onaylandı)|(?:ekledim|sildim|kaydettim|güncelledim|tamamladım|ayı[r]?ttım|iptal ettim|hatırlayacağım))/u.test(normalized)
 ? "Bu işlemin tamamlandığını doğrulayamadım. İlgili onay kartını veya uygulama ekranını kullanarak devam edebilirsin." : message;
}
