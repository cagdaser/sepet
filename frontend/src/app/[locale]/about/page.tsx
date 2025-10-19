import {getTranslations} from 'next-intl/server';
import {Link} from '@/i18n/navigation';

export default async function AboutPage() {
  const t = await getTranslations('AboutPage');
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-6">{t('title')}</h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            {t('description')}
          </p>
        </div>

        {/* Content */}
        <div className="prose prose-lg mx-auto mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Modern Stack</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Next.js 15 with App Router</li>
                <li>• TypeScript for type safety</li>
                <li>• Tailwind CSS for styling</li>
                <li>• shadcn/ui components</li>
              </ul>
            </div>
            
            <div className="bg-gray-50 p-6 rounded-lg">
              <h3 className="text-xl font-semibold mb-4">Features</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• Multi-language support</li>
                <li>• SEO optimized</li>
                <li>• Responsive design</li>
                <li>• Ready for production</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link 
            href="/" 
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            ← {t('backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
} 