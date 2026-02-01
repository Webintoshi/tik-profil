# Architecture Decision Records (ADR)

TikProfil projesinin önemli mimari kararlarının kaydı.

## ADR Nedir?

Architecture Decision Record (ADR), bir projedeki önemli mimari kararları belgeleyen kısa metinlerdir. Her ADR:

- Bağlamı açıklar
- Kararı belirtir
- Alternatifleri listeler
- Sonuçları değerlendirir

## ADR Listesi

| ID | Başlık | Durum | Tarih |
|----|--------|-------|-------|
| [ADR-001](./adr-001-monorepo.md) | Monorepo Yapısı | Kabul Edildi | 2026-01-15 |
| [ADR-002](./adr-002-supabase.md) | Database Provider Seçimi | Kabul Edildi | 2026-01-15 |
| [ADR-003](./adr-003-nextjs-15.md) | Next.js 15 Geçişi | Kabul Edildi | 2026-01-20 |

## ADR Şablonu

Yeni ADR oluştururken bu şablonu kullanın:

```markdown
# ADR-[XXX]: [Başlık]

## Durum
[Önerildi | Kabul Edildi | Reddedildi | Deprecated | Değiştirildi]

## Bağlam
[Ne ile karşı karşıyayız? Hangi problemi çözmeye çalışıyoruz?]

## Karar
[Ne karar verdik? Hangi çözümü seçtik?]

## Alternatifler
### Alternatif 1: [İsim]
- Artılar: ...
- Eksiler: ...
- Karar: [Neden seçilmedi?]

## Sonuçlar
### Artılar
- ...

### Eksiler  
- ...

## Referanslar
- [Link]...
```

## ADR Workflow

1. **Önerme:** Yeni ADR dosyası oluştur, Durum: "Önerildi"
2. **Review:** Takım gözden geçirir
3. **Kabul:** Durum güncellenir: "Kabul Edildi"
4. **Implementasyon:** Karar uygulanır

## ADR Kuralları

- Her önemli mimari karar belgelenir
- ADR'ler değiştirilemez, sadece yeni ADR ile "Değiştirildi" olarak işaretlenir
- Kısa ve öz tutulur
- Bağlam mutlaka belirtilir
