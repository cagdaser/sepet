import {useTranslations} from 'next-intl';
import {Link} from '@/i18n/navigation';
import Image from "next/image";

export default function HomePage() {
  const t = useTranslations('HomePage');
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center max-w-4xl mx-auto">
        {/* Hero Section */}
        <div className="mb-12">
          <Image
            className="dark:invert mx-auto mb-8"
            src="/next.svg"
            alt="Next.js logo"
            width={180}
            height={38}
            priority
          />
          
          <h1 className="text-4xl font-bold mb-6">{t('title')}</h1>
          
          <div className="mb-8">
            <Link 
              href="/about" 
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              {t('about')}
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <div className="p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">TypeScript</h3>
            <p className="text-gray-600">Full TypeScript support with type safety</p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">i18n Ready</h3>
            <p className="text-gray-600">Multi-language support with next-intl</p>
          </div>
          <div className="p-6 border border-gray-200 rounded-lg">
            <h3 className="text-lg font-semibold mb-3">shadcn/ui</h3>
            <p className="text-gray-600">Beautiful components with Tailwind CSS</p>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-gray-50 rounded-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Getting Started</h2>
          <ol className="list-decimal list-inside text-left max-w-md mx-auto space-y-2 text-gray-700">
            <li>
              Edit{" "}
              <code className="bg-gray-200 px-2 py-1 rounded text-sm font-mono">
                src/app/[locale]/page.tsx
              </code>
            </li>
            <li>Save and see your changes instantly</li>
            <li>Build something amazing!</li>
          </ol>
        </div>

        {/* External Links */}
        <div className="flex gap-4 items-center justify-center mt-12">
          <a
            className="inline-flex items-center px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
            href="https://vercel.com/new"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="mr-2"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            href="https://nextjs.org/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read docs
          </a>
        </div>
      </div>
    </div>
  );
} 