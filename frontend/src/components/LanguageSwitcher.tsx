'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { Button } from '@/components/ui/button';

export default function LanguageSwitcher() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLanguageChange = (locale: string) => {
    router.replace(pathname, { locale });
  };

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleLanguageChange('en')}
      >
        EN
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleLanguageChange('tr')}
      >
        TR
      </Button>
    </div>
  );
} 