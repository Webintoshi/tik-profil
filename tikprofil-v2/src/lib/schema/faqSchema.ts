export const faqData = [
    {
        '@type': 'Question',
        name: 'Ücretsiz plan gerçekten ücretsiz mi?',
        acceptedAnswer: {
            '@type': 'Answer',
            text: 'Evet! Temel profil özellikleri sonsuza kadar ücretsiz. İşletme adı, logo, iletişim bilgileri, sosyal linkler ve temel galeri tamamen ücretsiz olarak kullanılabilir.'
        }
    },
    {
        '@type': 'Question',
        name: 'Profil linkimi özelleştirebilir miyim?',
        acceptedAnswer: {
            '@type': 'Answer',
            text: 'Evet, tikprofil.com/isletme-adi formatında kısa, özel ve akılda kalıcı bir link alırsınız. PRO planda özel domain de bağlayabilirsiniz.'
        }
    },
    {
        '@type': 'Question',
        name: 'Kredi kartı gerekli mi?',
        acceptedAnswer: {
            '@type': 'Answer',
            text: 'Hayır! Ücretsiz plan için hiçbir ödeme bilgisi gerektirmez. Sadece PRO özelliklere geçmek isterseniz ödeme alınır.'
        }
    },
    {
        '@type': 'Question',
        name: 'Modülleri sonradan ekleyebilir miyim?',
        acceptedAnswer: {
            '@type': 'Answer',
            text: 'Kesinlikle! İhtiyaç duyduğunuz her an modül mağazasından tek tıkla ekleme yapabilirsiniz. Modüller aylık veya yıllık abonelik ile aktive edilir.'
        }
    },
    {
        '@type': 'Question',
        name: 'Teknik destek var mı?',
        acceptedAnswer: {
            '@type': 'Answer',
            text: 'Evet, tüm kullanıcılara e-posta desteği sunuyoruz. PRO kullanıcılar 7/24 canlı destek ve öncelikli yanıt hakkına sahiptir.'
        }
    }
];

export const generateFAQSchema = () => {
    return JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: faqData
    });
};
