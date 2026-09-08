'use client';

import { useLanguage } from '@/components/LanguageProvider';
import { SUPPORTED_LANGUAGES } from '@/lib/languagePreference';
import { Check } from 'lucide-react';

export default function LanguageSettingsPage() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Language</h2>
      <p className="text-sm text-gray-500 mb-4">
        Used to help VoxaBoard understand short phrases, slang, and romanized text (e.g. Sinhala
        or Tamil written in Latin letters) more accurately when interpreting phrases and cards.
      </p>

      <div className="space-y-2">
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border text-left transition-colors ${
              language === lang.code
                ? 'border-purple-500 bg-purple-50 text-purple-800'
                : 'border-gray-200 hover:bg-gray-50 text-gray-700'
            }`}
          >
            <span className="font-medium">{lang.label}</span>
            {language === lang.code && <Check size={18} className="text-purple-600" />}
          </button>
        ))}
      </div>
    </div>
  );
}
