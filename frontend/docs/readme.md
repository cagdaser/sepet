# Next.js Starter Pack

Modern Next.js starter with TypeScript, i18n, and shadcn/ui.

## 🚀 Features

- **Next.js 15** + TypeScript + Tailwind CSS
- **shadcn/ui** components
- **Multi-language** support (EN/TR)
- **SEO optimized** (robots.txt, sitemap.xml)
- **Responsive** Header & Footer
- **Production ready**

## 📦 Quick Setup

```bash
# 1. Clone and setup
git clone <repo-url> your-project-name
cd your-project-name

# 2. Change project name in package.json
# "name": "your-project-name"

# 3. Install dependencies
npm install
```

**Or create from scratch:**

```bash
# 1. Create Next.js project
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes

# 2. Install dependencies
npx shadcn@latest init --yes
npx shadcn@latest add button card
npm install next-intl

# 3. Create directories
mkdir -p messages src/i18n "src/app/[locale]" "src/app/[locale]/components"
```

## 🌐 Configuration Files

**next.config.ts**
```typescript
import {NextConfig} from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {};
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
```

**src/middleware.ts**
```typescript
import createMiddleware from 'next-intl/middleware';
import {routing} from './i18n/routing';

export default createMiddleware(routing);
export const config = {
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)'
};
```

**src/i18n/routing.ts**
```typescript
import {defineRouting} from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'tr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed' // SEO: default dil prefix-free
});
```

**src/i18n/navigation.ts**
```typescript
import {createNavigation} from 'next-intl/navigation';
import {routing} from './routing';

export const {Link, redirect, usePathname, useRouter, getPathname} =
  createNavigation(routing);
```

**src/i18n/request.ts**
```typescript
import {getRequestConfig} from 'next-intl/server';
import {hasLocale} from 'next-intl';
import {routing} from './routing';

export default getRequestConfig(async ({requestLocale}) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default
  };
});
```

## 📝 Translation Files

**messages/en.json**
```json
{
  "HomePage": { "title": "Hello world!", "about": "Go to the about page" },
  "AboutPage": { "title": "About Us", "description": "About page description", "backHome": "Back to Home" },
  "Navigation": { "home": "Home", "about": "About", "language": "Language" }
}
```

**messages/tr.json**
```json
{
  "HomePage": { "title": "Merhaba dünya!", "about": "Hakkında sayfasına git" },
  "AboutPage": { "title": "Hakkımızda", "description": "Hakkında sayfa açıklaması", "backHome": "Ana Sayfaya Dön" },
  "Navigation": { "home": "Ana Sayfa", "about": "Hakkında", "language": "Dil" }
}
```

## 🔍 SEO Files

**src/app/robots.ts**
```typescript
import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/sitemap.xml`,
  };
}
```

**src/app/sitemap.ts**
```typescript
import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  const urls: MetadataRoute.Sitemap = [];

  routing.locales.forEach((locale) => {
    const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    urls.push(
      { url: `${baseUrl}${prefix}`, lastModified: new Date(), priority: 1 },
      { url: `${baseUrl}${prefix}/about`, lastModified: new Date(), priority: 0.8 }
    );
  });
  return urls;
}
```

## 📁 File Structure

```
├── messages/           # Translations
├── src/
│   ├── app/
│   │   ├── robots.ts
│   │   ├── sitemap.ts
│   │   └── [locale]/
│   │       ├── components/
│   │       ├── about/page.tsx
│   │       ├── layout.tsx
│   │       └── page.tsx
│   ├── components/
│   ├── i18n/
│   └── middleware.ts
└── next.config.ts
```

## 🌐 URLs

- **English**: `/` `/about` (prefix-free)
- **Turkish**: `/tr` `/tr/about`

## 🚀 Usage

```bash
npm run dev    # Development
npm run build  # Build
npm start      # Production
```

## ⚙️ Environment

```bash
# .env.local
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
```

Ready-to-use Next.js starter for modern web applications! 🎉