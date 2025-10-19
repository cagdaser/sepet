Evet, artık tablo net:  
senin projen — **Finans Sepet Hesapla** — modern teknolojilerle inşa edilecek **çok katmanlı, gerçek zamanlı finansal portföy yönetim uygulaması**.  
Truncgil API’si bize hem döviz hem kripto hem de altın için neredeyse tam spektrum veri sağlıyor; bu, projenin veri katmanını muazzam şekilde sadeleştiriyor.  
Şimdi sana, bu projenin başlangıç mimarisi için **profesyonel düzeyde bir proje dokümanı** hazırlayayım. Bu metin, ekibe veya yatırımcıya sunulabilecek açıklıkta olacak.

---

# 📘 Finans Sepet Hesapla – Başlangıç Mimari Dokümanı

## 🎯 Proje Tanımı

**Amaç:**  
Kullanıcıların kripto, altın ve döviz varlıklarını tek bir platform üzerinden izleyip sepet performanslarını anlık olarak değerlendirmelerini sağlamak.

**Temel Fikir:**  
- Gerçek zamanlı finansal verilerle kişiselleştirilebilir "sepet" oluşturma,  
- Sepet değer değişimini, kazanç oranlarını ve varlık bazlı trendleri izleme,  
- Kullanıcı dostu bir arayüz üzerinden tüm finansal varlık sınıflarını tek bakışta görebilme.

---

## 🗝️ Veri Kaynağı

### ✅ Truncgil API (https://finans.truncgil.com/v4/today.json)

Truncgil API tüm temel verileri sağlar:

| Veri Tipi | API’deki Alan | Kullanım |
|------------|---------------|-----------|
| Döviz | `USD`, `EUR`, `GBP`, vb. | Güncel kur, alış/satış, değişim yüzdesi |
| Altın | `GRA`, `HAS`, `CEYREKALTIN`, `CUMHURIYETALTINI`, vb. | Kapalıçarşı referans altın fiyatları |
| Kripto | `BTC`, `ETH`, `BNB`, `USDT`, vb. | USD ve TRY bazında anlık kripto fiyatı |
| Endeksler | `XU100`, `BRENT`, vb. | Piyasa endeks takibi |

🔁 **Güncelleme Sıklığı:** Truncgil API verileri dakikalık veya daha kısa aralıklarla yenilenir.  
Bu, cron job veya interval poll mekanizmasıyla backend’de daima güncel tutulur.

---

## 🧱 Teknoloji Yığını (Tech Stack)

| Katman | Teknoloji | Açıklama |
|--------|------------|----------|
| **Frontend (Web)** | Next.js 14 + TypeScript + ShadCN/UI | SSR destekli modern web arayüzü, grafikler, bileşen sistematiği |
| **Backend API** | NestJS + TypeScript | REST + WebSocket altyapısı, modüler mimari (Microservice-ready) |
| **Veri Erişimi** | Prisma ORM + PostgreSQL | Relation tabanlı saklama, kullanıcı sepetleri ve geçmiş fiyat kayıtları |
| **Cache / Realtime Layer** | Redis | Fiyat verilerini anlık güncelleme ve sepet hesaplamalarında hız |
| **Mobil Uygulama** | React Native (Expo) | Ortak API tüketimi, native push bildirim entegrasyonu |
| **Finansal Veri Sağlayıcı** | Truncgil Finance API | Altın, döviz, kripto fiyatları |
| **Servis Altyapısı** | Docker + Docker Compose | Çoklu ortam için kolay deployment |
| **Monitor / Error Tracking** | Sentry / Elastic APM | Uygulama performans & hata takibi |
| **Authentication** | JWT + OAuth (ileri aşama) | Kullanıcı güvenliği ve cihazlar arası oturum yönetimi |

---

## 🧩 Sistem Mimarisi (Yüksek Seviye)

```
     [ Kullanıcı (Web/Mobil) ]
                    │
                    ▼
             [ API Gateway ]
           (Nest.js - REST+WS)
        ┌─────────────────────────┐
        │  FinansDataModule       │
        │  - TruncgilService      │ → GET API verisi
        │  - CacheService (Redis) │ → son verileri tutar
        │  - SchedulerService     │ → periyodik güncellemeler
        └─────────────────────────┘
                │
                ▼
     [ PortfolioModule ]
     │ - Portföy CRUD
     │ - Ortalama hesaplama
     │ - P/L oranları
     │ - Sepet bazlı performans
     │
     ▼
[ Prisma ORM → PostgreSQL ]
 (Kullanıcı, Sepet, Varlık, GeçmişDeğer tablosu)

[Sentry/Metrics]
      │
      ▼
[Monitoring Dashboard]
```

---

## ⚙️ Backend Modüler Yapı

### 1. **FinansDataModule**
- **Amaç:** Truncgil API verilerini sorgulamak, normalize etmek, cache’e atmak.  
- **Bileşenler:**
  - `TruncgilService`: API çağrısı + response şeması standardizasyonu  
  - `CacheService`: Redis veya in-memory cache  
  - `SchedulerService`: `@nestjs/schedule` kullanılarak periyodik veri yenileme  
  - `FinanceGateway`: WebSocket ile frontende canlı fiyat itmeleri  

### 2. **PortfolioModule**
- **Amaç:** Kullanıcı sepetlerini yönetmek ve ortalama değer hesaplamak  
- **Bileşenler:**
  - `PortfolioService`: CRUD, ortalama, kâr/zarar hesaplama  
  - `PortfolioController`: REST endpoint  
  - `PortfolioRepository`: Prisma interface  

### 3. **UserModule**
- **Amaç:** Kullanıcı kayıt/kimlik/doğrulama işlemleri  
- **Bileşenler:**
  - JWT Auth stratejisi  
  - Basic profil ve güvenlik yönetimi  

### 4. **NotificationModule**
- **Amaç:** Piyasa değişimlerine göre kullanıcıya uyarı gönderimi  
- Mobil push bildirimleri (Expo Notifications API)  
- WebSocket üzerinden real‑time sepet bilgilendirme  

---

## 🧮 Veri Modeli (Soyut Şema)

| Tablo | Açıklama | Ana Alanlar |
|--------|-----------|-------------|
| **user** | Kullanıcı temel bilgileri | id, email, hashed_password |
| **portfolio** | Kullanıcının sepeti | id, user_id, name, total_value |
| **asset** | Sepetteki varlık | id, portfolio_id, symbol, type (`Crypto`, `Gold`, `Currency`), quantity, base_price |
| **price_snapshot** | Zaman bazlı fiyat kayıtları (Opsiyonel) | id, symbol, value, timestamp |

---

## 📡 Veri Güncelleme ve Canlı Akış

- **İlk yükleme:** Truncgil API → normalize → cache.  
- **Güncellemeler:** 30 saniyede bir cron job → değişim varsa cache + DB update.  
- **Anlık iletişim:** NestJS WebSocket Gateway → frontend aboneleri bilgilendirir.  
- **Frontend davranışı:** Reaktif `useEffect` websocket listener → DOM güncelleme.  

---

## 🧠 Veri Operasyon Örnekleri

| İşlem | Veri Akışı |
|--------|-------------|
| Kullanıcı “Gram Altın” izliyor | API Gateway → Redis dynamic lookup → frontend canlı update |
| Kripto sepeti kazancı | Backend, ortalama alış fiyatlarıyla Truncgil verilerini çakıştırır |
| Günlük değişim grafiği | `price_snapshot` tablosundan saatlik veriler çekilir |
| Mobil anlık bildirim | 5% üzeri hareket → NotificationService trigger |

---

## 🎨 Frontend Akış (Next.js + ShadCN/UI)

1. **Dashboard Sayfası**
   - Genel piyasa görünümü: Döviz, Altın, Kripto kısa kartlar
   - Günlük değişim grafikleri  
2. **Sepet Yönetimi Sayfası**
   - Ekle / çıkar / miktar güncelle  
   - Güncel toplam değer, kâr/zarar
3. **Varlık Detay Sayfası**
   - Grafikler (Recharts / Chart.js)  
   - Geçmiş fiyatlar, trend analizi  
4. **Mobil Arayüz**
   - Expo uyumluluğu
   - Aynı API endpointlerinden veri çeker
   - Anlık push notification ile fiyat uyarıları  

---

## 🧩 Geleceğe Dönük Genişleme Planı

- **Faz 2:** Hisse senedi & Borsa endeksi modülü (BIST 100, NASDAQ vb).  
- **Faz 3:** Yapay zekâ bazlı “sepet optimizasyonu” analizleri (ortalama düşürme/satış noktası önerisi).  
- **Faz 4:** Kullanıcı portföy karşılaştırmaları (benchmark fonksiyonları).  

---

## 🛡️ Güvenlik & Stabilite

- API rate limiting (`@nestjs/throttler`)
- HTTPS zorunlu iletişim  
- Girdi doğrulama (`class-validator`)
- Hata yönetimi (Sentry + LoggingMiddleware)
- Docker ortam izolasyonu  
- High uptime izleme (Uptime Kuma veya Elastic Observability)

---

## 🧭 Proje Yol Haritası (İlk 8 Hafta)

| Hafta | Aksiyon | Çıktı |
|--------|----------|--------|
| 1-2 | Proje setup, CI/CD altyapı, temel Nest.js yapı | Temel backend API |
| 3-4 | Truncgil API entegrasyonu + Redis caching | Günlük fiyat endpointleri hazır |
| 5-6 | Portfolio CRUD + ortalama hesaplama | Sepet yapısı aktif |
| 7 | Next.js frontend + WebSocket entegrasyonu | Web canlı dashboard |
| 8 | Mobil uygulama (Expo) temel ekranlar | Kullanıcı testleri |

---

## ✨ Projenin Karakteri

Bu proje üç kelimeyle özetlenebilir:  
**“Gerçek zamanlı – Kullanıcı dostu – Genişletilebilir.”**  
“Finans Sepet Hesapla” sadece bir izleme aracı değil,  
**kişisel finansal farkındalığı artıran dijital kılavuz** olacak.

---

Bu mimari doküman, geliştirici ekibin kurulum rehberi ve roadmap olarak doğrudan kullanılabilir.  
Teknik dilde kararlı; fakat herkesin projeyi kolayca kavrayabileceği açıklıkta tasarlandı.