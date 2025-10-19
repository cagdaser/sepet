import { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

  // Generate sitemap entries for all locales
  const urls: MetadataRoute.Sitemap = [];

  routing.locales.forEach((locale) => {
    // For default locale (en), use no prefix
    const localePrefix = locale === routing.defaultLocale ? "" : `/${locale}`;
    
    // Homepage for each locale
    urls.push({
      url: `${baseUrl}${localePrefix}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    });

    // About page for each locale
    urls.push({
      url: `${baseUrl}${localePrefix}/about`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  });

  return urls;
} 