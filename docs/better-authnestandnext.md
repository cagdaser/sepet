# Better Auth + NestJS + Next.js + Prisma Entegrasyon Kılavuzu

## 📋 Genel Bakış

Bu kılavuz, NestJS backend + Next.js frontend projelerde Better Auth entegrasyonunu adım adım açıklamaktadır. Prisma ORM ve PostgreSQL veritabanı kullanılmaktadır.

## 🚀 Başlangıç

### Gereksinimler
- Node.js 18+
- PostgreSQL veritabanı
- npm/yarn paket yöneticisi

### Proje Yapısı
```
sepet/
├── backend/          # NestJS API
├── frontend/         # Next.js App
└── docs/            # Dokümantasyon
```

## 🗄️ BACKEND (NestJS) ENTEGRASYONU

### 1. Paket Kurulumları

```bash
cd backend
npm install better-auth @thallesp/nestjs-better-auth @prisma/client
npm install prisma --save-dev
```

#### package.json Dependencies
```json
{
  "dependencies": {
    "@nestjs/common": "^11.1.6",
    "@nestjs/config": "^4.0.2",
    "@nestjs/core": "^11.1.6",
    "@nestjs/platform-express": "^11.1.6",
    "@nestjs/throttler": "^6.4.0",
    "@prisma/client": "^6.17.1",
    "@thallesp/nestjs-better-auth": "^2.1.0",
    "better-auth": "^1.3.27",
    "prisma": "^6.17.1"
  }
}
```

### 2. Prisma Schema Konfigürasyonu

`backend/prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Better Auth compatible User model
model User {
  id            String    @id @default(cuid())
  name          String
  email         String    @unique
  emailVerified Boolean   @default(false) @map("email_verified")
  image         String?
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  
  // Better Auth relations
  accounts      Account[]
  sessions      Session[]
  
  // Application specific relations
  portfolios    Portfolio[]
  notifications Notification[]

  @@map("user")
}

// Better Auth Account model
model Account {
  id                String  @id @default(cuid())
  accountId         String  @map("account_id")
  providerId        String  @map("provider_id") 
  userId            String  @map("user_id")
  accessToken       String? @map("access_token")
  refreshToken      String? @map("refresh_token")
  idToken           String? @map("id_token")
  accessTokenExpiresAt DateTime? @map("access_token_expires_at")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  scope             String?
  password          String?
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("account")
}

// Better Auth Session model  
model Session {
  id        String   @id @default(cuid())
  expiresAt DateTime @map("expires_at")
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  ipAddress String?  @map("ip_address")
  userAgent String?  @map("user_agent")
  userId    String   @map("user_id")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("session")
}

// Better Auth Verification model
model Verification {
  id         String   @id @default(cuid())
  identifier String
  value      String
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("verification")
}
```

### 3. Better Auth Konfigürasyonu

`backend/src/auth.ts`:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  emailVerification: {
    enabled: true,
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      enabled: !!process.env.GOOGLE_CLIENT_ID,
    },
  },
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  basePath: "/api/auth",
  trustedOrigins: ["http://localhost:3000"], // Frontend URL
  hooks: {}, // Enable hooks for NestJS integration
});
```

### 4. NestJS App Module Entegrasyonu

`backend/src/app.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { auth } from './auth';

@Module({
  imports: [
    // Configuration module for environment variables
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute
    }]),
    
    // Better Auth integration - KRITIK: Bu satır
    AuthModule.forRoot({ auth }),
    
    // Database module (global)
    PrismaModule,
    
    // Diğer modüller...
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
```

### 5. Prisma Service

`backend/src/prisma/prisma.service.ts`:

```typescript
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    console.log('✅ Database connected successfully');
  }
}
```

`backend/src/prisma/prisma.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
```

### 6. Environment Variables

`backend/.env`:

```env
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/finans_sepet?schema=public"

# Better Auth Configuration - KRITIK
BETTER_AUTH_SECRET="your-super-secret-better-auth-key-change-this-in-production"
BETTER_AUTH_URL="http://localhost:3001"

# Google OAuth (Opsiyonel)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""

# API Configuration
PORT=3001
NODE_ENV=development
```

### 7. Database Migration

```bash
# Prisma generate
npx prisma generate

# Database push
npx prisma db push

# Migration (production için)
npx prisma migrate dev --name better_auth_init
```

## 🎨 FRONTEND (Next.js) ENTEGRASYONU

### 1. Paket Kurulumları

```bash
cd frontend
npm install better-auth sonner
```

#### package.json Dependencies
```json
{
  "dependencies": {
    "better-auth": "^1.3.27",
    "sonner": "^1.x.x",
    "next": "15.3.4",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

### 2. Auth Client Oluşturma

`frontend/src/lib/api/auth-client.ts`:

```typescript
import { createAuthClient } from "better-auth/react";
import { toast } from "sonner";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3001",
  basePath: "/api/auth",
});

// Auth utilities with toast notifications
export const authUtils = {
  // Sign up with email and password
  async signUp(data: { 
    email: string; 
    password: string; 
    name: string;
  }) {
    try {
      const result = await authClient.signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
      });

      if (result.data) {
        toast.success("Hesabınız başarıyla oluşturuldu!");
        return { success: true, data: result.data };
      } else {
        toast.error("Kayıt sırasında bir hata oluştu.");
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Sign up error:", error);
      toast.error("Beklenmeyen bir hata oluştu.");
      return { success: false, error };
    }
  },

  // Sign in with email and password
  async signIn(data: { 
    email: string; 
    password: string;
  }) {
    try {
      const result = await authClient.signIn.email({
        email: data.email,
        password: data.password,
      });

      if (result.data) {
        toast.success("Giriş başarılı!");
        return { success: true, data: result.data };
      } else {
        toast.error("E-posta veya şifre hatalı.");
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error("Sign in error:", error);
      toast.error("Giriş sırasında bir hata oluştu.");
      return { success: false, error };
    }
  },

  // Sign in with Google
  async signInWithGoogle() {
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard",
      });
    } catch (error) {
      console.error("Google sign in error:", error);
      toast.error("Google ile giriş başarısız.");
    }
  },

  // Sign out
  async signOut() {
    try {
      await authClient.signOut();
      toast.success("Çıkış yapıldı.");
      return { success: true };
    } catch (error) {
      console.error("Sign out error:", error);
      toast.error("Çıkış sırasında bir hata oluştu.");
      return { success: false, error };
    }
  },

  // Get session
  async getSession() {
    try {
      const session = await authClient.getSession();
      return session;
    } catch (error) {
      console.error("Get session error:", error);
      return null;
    }
  },

  // Use session hook
  useSession: () => {
    return authClient.useSession();
  },
};

export default authClient;
```

### 3. Register Sayfası

`frontend/src/app/[locale]/register/page.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { authUtils } from "@/lib/api/auth-client";
import { Eye, EyeOff, Mail, User, Lock, Loader2 } from "lucide-react";
import { toast, Toaster } from "sonner";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const router = useRouter();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Ad soyad gereklidir";
    }

    if (!formData.email.trim()) {
      newErrors.email = "E-posta adresi gereklidir";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Geçerli bir e-posta adresi girin";
    }

    if (!formData.password) {
      newErrors.password = "Şifre gereklidir";
    } else if (formData.password.length < 6) {
      newErrors.password = "Şifre en az 6 karakter olmalıdır";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Şifreler eşleşmiyor";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const result = await authUtils.signUp({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (result.success) {
        toast.success("Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.");
        router.push("/login");
      }
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("Kayıt sırasında bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await authUtils.signInWithGoogle();
    } catch (error) {
      console.error("Google sign up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  return (
    <div className="min-h-screen flex">
      <Toaster position="top-center" richColors />
      
      {/* Left Side - Background Image */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-orange-400 via-orange-500 to-red-500">
        <Image
          src="/login.webp"
          alt="Sepet Finance"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white space-y-6">
            <div className="text-4xl font-bold mb-4">
              💰 Sepet
            </div>
            <h1 className="text-3xl font-bold">
              Finansal Portföyünüzü Yönetin
            </h1>
            <p className="text-xl opacity-90 max-w-md">
              Kripto, altın ve döviz varlıklarınızı tek platformda izleyin. 
              Sepet performanslarını anlık olarak değerlendirin.
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-gray-50">
        <Card className="w-full max-w-md p-8 space-y-6 bg-white shadow-xl">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Hesap Oluştur</h2>
            <p className="text-gray-600">Topluluğumuza katılın</p>
          </div>

          {/* Google Sign Up */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-12 border-2 hover:bg-gray-50"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            {/* Google SVG Icon */}
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Google ile Kayıt Ol"
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-gray-500 bg-white">VEYA E-POSTA İLE DEVAM ET</span>
            </div>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form alanları burada - Ad, Email, Password, Confirm Password */}
            {/* ... (form alanları kılavuzda kısaltılmıştır) */}
            
            <Button
              type="submit"
              className="w-full h-12 bg-orange-500 hover:bg-orange-600 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Hesap Oluşturuluyor...
                </>
              ) : (
                "Hesap Oluştur"
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              Zaten hesabınız var mı?{" "}
              <Link href="/login" className="text-orange-500 hover:underline font-medium">
                Giriş Yap
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

### 4. Login Sayfası

`frontend/src/app/[locale]/login/page.tsx` - Register sayfasına benzer yapı, sadece form alanları farklı.

### 5. Environment Variables

`frontend/.env.local`:

```env
# Better Auth Configuration - KRITIK
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3001

# App Configuration
NEXT_PUBLIC_APP_NAME=Sepet Finance
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 🔧 KURULUM ADIMLari

### 1. Backend Kurulumu

```bash
# 1. Bağımlılıkları kur
cd backend
npm install

# 2. Prisma generate
npx prisma generate

# 3. Database push
npx prisma db push

# 4. Sunucuyu başlat
npm run start:dev
```

### 2. Frontend Kurulumu

```bash
# 1. Bağımlılıkları kur
cd frontend
npm install

# 2. Geliştirme sunucusunu başlat
npm run dev
```

### 3. Database Yönetimi

```bash
# Prisma Studio'yu aç
cd backend
npx prisma studio
# http://localhost:5555 açılır
```

## 🧪 TEST SENARYOLARI

### 1. Kayıt Testi
- URL: http://localhost:3000/register
- Test verisi:
  ```
  Ad Soyad: Test Kullanıcısı
  E-posta: test@sepet.com
  Şifre: test123456
  ```

### 2. Giriş Testi
- URL: http://localhost:3000/login
- Aynı test verilerini kullan

### 3. Session Kontrolü
```typescript
// Herhangi bir komponente ekle
import { authUtils } from "@/lib/api/auth-client";

const { data: session } = authUtils.useSession();
console.log("Aktif session:", session);
```

## 🔐 GÜVENLIK UYGULAMALARI

### Üretim Ortamı İçin
1. `BETTER_AUTH_SECRET` güvenli bir değer
2. HTTPS kullanımı zorunlu
3. CORS ayarları kontrol edilmeli
4. Rate limiting aktif olmalı
5. Google OAuth credentials üretimde ayarlanmalı

### Geliştirme Ortamı
- HTTP kullanımı güvenli
- Debug modlar aktif
- Test verileri kullanılıyor

## 🚨 SORUN GİDERME

### Backend Hataları
```bash
# Logları kontrol et
cd backend && npm run start:dev

# Veritabanı bağlantısını kontrol et
npx prisma db push

# Prisma generate
npx prisma generate
```

### Frontend Hataları
```bash
# Bağımlılıkları kontrol et
npm install better-auth sonner

# Environment variables kontrol et
cat .env.local
```

### Better Auth Hataları
```
ERROR [Better Auth]: Provider not found
ERROR [Better Auth]: User not found
```
Bu hatalar normal debug mesajlarıdır.

## 📁 DOSYA YAPIsI

### Backend
```
backend/
├── src/
│   ├── auth.ts                 # Better Auth config
│   ├── app.module.ts           # AuthModule.forRoot
│   └── prisma/
│       ├── prisma.service.ts   # Database service
│       └── prisma.module.ts    # Global module
├── prisma/
│   └── schema.prisma           # Auth modelleri
├── .env                        # Environment variables
└── package.json               # Dependencies
```

### Frontend
```
frontend/
├── src/
│   ├── lib/api/
│   │   └── auth-client.ts      # Better Auth client
│   └── app/[locale]/
│       ├── register/page.tsx   # Kayıt sayfası
│       └── login/page.tsx      # Giriş sayfası
├── .env.local                  # Environment variables
└── package.json               # Dependencies
```

## ✅ BAŞARI KRITERLERI

Bu kılavuzu takip ettikten sonra şunlar çalışmalı:

- [x] Kullanıcı kayıt işlemi
- [x] Email/şifre ile giriş
- [x] Session yönetimi
- [x] Form validasyonları
- [x] Toast bildirimleri
- [x] Responsive tasarım
- [ ] Google OAuth (API keys gerekli)
- [ ] Email doğrulama
- [ ] Şifre sıfırlama

## 🔄 GÜNCELLEMELER

Bu kılavuz başarılı bir implementasyon üzerine kuruludur. Yeni versiyonlarda paket güncellemeleri için:

1. `better-auth` versiyonunu kontrol et
2. `@thallesp/nestjs-better-auth` güncellemelerini takip et
3. Breaking changes için dokümantasyonu oku

---

**Bu kılavuz, çalışan bir sistemden çıkarılmıştır ve her adımı test edilmiştir. Aynı adımları takip ederek başarılı Better Auth entegrasyonu yapabilirsiniz.**
