# BMad Agents - TikProfil

Tüm ajanların detaylı referansı.

## Core Ajanlar

### BMad Master
| Özellik | Değer |
|---------|-------|
| **Dosya** | `_cfg/agents/bmad-master.md` |
| **Rol** | Orchestrator |
| **Görev** | Proje yönetimi, workflow koordinasyonu |

**Komutları:**
- `*workflow-init` - Proje analizi
- `*level-assess` - Seviye belirleme
- `*agent-assign` - Ajan atama
- `*bug-import` - Bug.md entegrasyonu

**Ne zaman kullanılır:**
- Yeni workflow başlatmak için
- Proje durumunu analiz etmek için
- Doğru ajanı seçmek için

---

### TikProfil PM
| Özellik | Değer |
|---------|-------|
| **Dosya** | `_cfg/agents/tikprofil-pm.md` |
| **Rol** | Product Manager |
| **Görev** | PRD yazma, story yönetimi |

**Komutları:**
- `*create-prd` - PRD oluştur
- `*create-story` - Story yaz
- `*story-map` - Story mapping

**Ne zaman kullanılır:**
- Yeni feature planlama
- Story yazma
- Prioritization

---

## Teknik Ajanlar

### Web Architect
| Özellik | Değer |
|---------|-------|
| **Dosya** | `_cfg/agents/web-architect.md` |
| **Rol** | Frontend Architect |
| **Stack** | Next.js 15, React 19, TypeScript |

**Komutları:**
- `*tech-spec --platform=web` - Web tech spec
- `*review-code --platform=web` - Code review

**Ne zaman kullanılır:**
- Web mimarisi kararları
- Next.js App Router yapılandırma
- Performance optimizasyonu

---

### Mobile Architect
| Özellik | Değer |
|---------|-------|
| **Dosya** | `_cfg/agents/mobile-architect.md` |
| **Rol** | React Native Architect |
| **Stack** | Expo SDK 54, React Native 0.81 |

**Komutları:**
- `*tech-spec --platform=mobile` - Mobile tech spec
- `*review-code --platform=mobile` - Code review

**Ne zaman kullanılır:**
- Mobile mimarisi kararları
- Navigation yapılandırma
- Platform-spesifik optimizasyon

---

### Supabase Expert
| Özellik | Değer |
|---------|-------|
| **Dosya** | `_cfg/agents/supabase-expert.md` |
| **Rol** | Database Architect |
| **Stack** | PostgreSQL, Supabase Auth, RLS |

**Komutları:**
- `*db-schema` - Schema tasarımı
- `*rls-policies` - RLS policy yazma
- `*migration` - Migration oluşturma

**Ne zaman kullanılır:**
- Database schema değişiklikleri
- RLS policy yazma
- Auth flow yapılandırma

---

### Full-Stack Dev
| Özellik | Değer |
|---------|-------|
| **Dosya** | `_cfg/agents/full-stack-dev.md` |
| **Rol** | Developer |
| **Platform** | Web + Mobile |

**Komutları:**
- `*dev-story --id=XXX` - Story implementasyonu
- `*implement` - Genel implementasyon

**Ne zaman kullanılır:**
- Story implementasyonu
- Bug fix
- Feature geliştirme

---

### Test Architect
| Özellik | Değer |
|---------|-------|
| **Dosya** | `_cfg/agents/test-architect.md` |
| **Rol** | QA/Testing Lead |
| **Tools** | Jest, RTL, Playwright |

**Komutları:**
- `*create-test-strategy` - Test stratejisi
- `*implement-tests` - Test yazma
- `*coverage` - Coverage analizi

**Ne zaman kullanılır:**
- Test stratejisi oluşturma
- Test case yazma
- Coverage iyileştirme

---

## Mevcut Ajanlar

### SEO Agent
| Özellik | Değer |
|---------|-------|
| **Dosya** | `agents/seo-agent.md` |
| **Rol** | SEO Specialist |
| **Skill** | seo-audit |

**Ne zaman kullanılır:**
- SEO denetimi
- Meta etiket optimizasyonu
- Teknik SEO

---

## Ajan Seçim Rehberi

```
Yapmak istediğiniz iş → Önerilen Ajan(lar)

🎯 Yeni feature planlama
   → BMad Master → TikProfil PM

🏗️ Mimari kararlar
   → Web Architect (Web için)
   → Mobile Architect (Mobile için)
   → Supabase Expert (DB için)

💻 Kod yazma
   → Full-Stack Dev

🧪 Test yazma
   → Test Architect

🐛 Bug çözme
   → BMad Master → Full-Stack Dev

🔍 SEO optimizasyonu
   → SEO Agent

📊 Proje analizi
   → BMad Master
```

## Çoklu Ajan Senaryoları

### Feature Geliştirme
```
1. BMad Master - Workflow başlat
2. TikProfil PM - PRD oluştur
3. Web/Mobile Architect - Tech spec
4. Supabase Expert - DB schema
5. Full-Stack Dev - Implementasyon
6. Test Architect - Test yazma
```

### Bug Fix
```
1. BMad Master - Analiz
2. Full-Stack Dev - Çözüm
3. Test Architect - Test
```

## Ajan Yükleme

```bash
# Ajan dosyasını yükle
load bmad/_cfg/agents/[agent-name].md

# Örnek:
load bmad/_cfg/agents/bmad-master.md
load bmad/_cfg/agents/tikprofil-pm.md
```

## Özelleştirme

Ajanları `_cfg/agents/` dizinindeki dosyalardan özelleştirebilirsiniz:

- İsim değiştirme
- Rol tanımlama
- Özel komutlar ekleme
- Proje-spesifik bilgiler güncelleme

Değişiklikler update-safe'dir, yani BMad güncellemelerinde korunur.
