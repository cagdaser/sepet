# Better Auth Entegrasyon Rehberi

## 🚀 Better Auth Entegrasyonu Tamamlandı!

### Backend Yapılandırması

#### Prisma Schema
Better Auth ile uyumlu modeller:
- `User` - Kullanıcı bilgileri
- `Account` - OAuth hesap bağlantıları  
- `Session` - Oturum yönetimi
- `Verification` - E-posta doğrulama

#### NestJS Entegrasyonu
- `@thallesp/nestjs-better-auth` paketi kullanıldı
- Auth endpoint'leri `/api/auth/*` altında aktif
- Port: 3001

### Frontend Yapılandırması

#### Auth Client
- `frontend/src/lib/api/auth-client.ts` - Better Auth React client
- Toast bildirimler (sonner) entegreli
- Hata yönetimi ve kullanıcı bildirimleri

#### Sayfalar
- `/register` - Kayıt sayfası
- `/login` - Giriş sayfası
- Google OAuth + Email/Password desteği

### Auth API Endpoint'leri

| Method | Endpoint | Açıklama |
|--------|----------|----------|
| POST | `/api/auth/sign-up/email` | Email ile kayıt |
| POST | `/api/auth/sign-in/email` | Email ile giriş |
| POST | `/api/auth/sign-in/social` | Google ile giriş |
| POST | `/api/auth/sign-out` | Çıkış |
| GET | `/api/auth/session` | Session bilgisi |

### Test Kullanıcısı

Kayıt sırasında oluşturulan test kullanıcısı:

```
Ad Soyad: Test Kullanıcısı
E-posta: test@sepet.com
Şifre: test123456
```

### Kullanıcı Verilerini Görüntüleme

#### 1. Prisma Studio (Önerilen)
```bash
cd backend
npx prisma studio
```
- Tarayıcıda http://localhost:5555 açılır
- `User`, `Account`, `Session` tablolarını görüntüleyebilirsiniz

#### 2. PostgreSQL Veritabanı
```bash
psql -h localhost -U postgres -d finans_sepet
```
```sql
-- Kullanıcıları listele
SELECT id, name, email, "emailVerified", "createdAt" FROM "user";

-- Session'ları listele  
SELECT u.name, u.email, s.token, s."expiresAt" 
FROM "user" u 
JOIN "session" s ON u.id = s."userId";

-- Account'ları listele (OAuth bağlantıları)
SELECT u.name, a."providerId", a."accountId" 
FROM "user" u 
JOIN "account" a ON u.id = a."userId";
```

#### 3. Admin Panel (Gelecek Geliştirme)
Admin paneli oluşturulabilir:
- `/admin/users` - Kullanıcı listesi
- `/admin/sessions` - Aktif oturumlar
- `/admin/analytics` - Auth istatistikleri

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/finans_sepet?schema=public"

# Better Auth
BETTER_AUTH_SECRET="your-super-secret-better-auth-key-change-this-in-production"
BETTER_AUTH_URL="http://localhost:3001"

# Google OAuth (Opsiyonel)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
```

#### Frontend (.env.local)
```env
# Better Auth
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001

# App
NEXT_PUBLIC_APP_NAME=Sepet Finance
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Erişim URL'leri

| URL | Açıklama |
|-----|----------|
| http://localhost:3000 | Ana sayfa |
| http://localhost:3000/register | Kayıt sayfası |
| http://localhost:3000/login | Giriş sayfası |
| http://localhost:3001/api/docs | Backend API Docs |
| http://localhost:5555 | Prisma Studio |

### Test Senaryoları

#### ✅ Tamamlanan Testler
- [x] Email/password ile kullanıcı kaydı
- [x] Form validasyonları
- [x] Kayıt sonrası otomatik yönlendirme
- [x] UI/UX tasarım kontrolü
- [x] Toast bildirimler

#### 📋 Test Edilebilir Özellikler
- [ ] Email/password ile giriş
- [ ] Google OAuth giriş (Google API keys gerekli)
- [ ] Çıkış işlemi
- [ ] Session yönetimi
- [ ] "Beni Hatırla" özelliği

### Güvenlik Notları

#### Üretim Ortamı İçin
1. `BETTER_AUTH_SECRET` değiştirilmeli
2. HTTPS kullanılmalı
3. Google OAuth credentials üretimde ayarlanmalı
4. Rate limiting aktif
5. CORS ayarları kontrol edilmeli

#### Geliştirme Ortamı
- Localhost'ta HTTP kullanımı güvenli
- Test verileri kullanılıyor
- Debug modlar aktif

### Sorun Giderme

#### Backend Log'larını Kontrol Et
```bash
cd backend && npm run start:dev
```

#### Frontend Log'larını Kontrol Et  
```bash
cd frontend && npm run dev
```

#### Veritabanı Bağlantısı
```bash
cd backend && npx prisma db push
```

#### Better Auth Debug
Better Auth hataları terminal'de görünecektir:
```
2025-10-20T01:00:07.591Z ERROR [Better Auth]: Provider not found
2025-10-20T00:39:41.096Z ERROR [Better Auth]: User not found
```

### Gelecek Geliştirmeler

#### Öncelikli
- [ ] Dashboard sayfası (/dashboard)
- [ ] Profil düzenleme sayfası
- [ ] Şifre sıfırlama özelliği
- [ ] Email doğrulama

#### İleri Seviye
- [ ] Admin paneli
- [ ] İki faktörlü kimlik doğrulama (2FA)
- [ ] OAuth provider'lar (GitHub, Facebook)
- [ ] Kullanıcı rolleri ve izinleri

---

**Not:** Bu dokümantasyon düzenli olarak güncellenecektir. Better Auth entegrasyonu başarıyla tamamlanmış ve çalışır durumda.
