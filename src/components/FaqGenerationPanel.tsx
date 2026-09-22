'use client';

import { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

interface FaqQuestion {
  text: string;
  keyPhrase: string | null;
}

interface Props {
  locationId: string;
  initialFaqs: FaqQuestion[];
  initialStatus: 'ok' | 'failed' | 'pending' | 'none';
}

export default function FaqGenerationPanel({ locationId, initialFaqs, initialStatus }: Props) {
  const [faqs, setFaqs] = useState(initialFaqs);
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/locations/${locationId}/regenerate-faqs`, {
        method: 'POST',
      });
      const body = await response.json();
      if (!response.ok || !body.success) {
        throw new Error(body.error || 'Failed to generate questions');
      }
      setFaqs(body.data.faqs);
      setStatus('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate questions');
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-lg font-semibold text-gray-800">AAC Sample Questions</h2>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Sparkles size={14} />
          )}
          {faqs.length > 0 ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Questions an AAC device user might ask about this location&apos;s instructions — generated once
        automatically when the location was created, and available here to preview or regenerate before
        the QR code is printed/shared.
      </p>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
          {error}
        </p>
      )}

      {status === 'failed' && faqs.length === 0 && !error && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2 mb-3">
          Generation failed when this location was created. Click &quot;Generate&quot; to retry.
        </p>
      )}

      {faqs.length === 0 && status !== 'failed' && !loading && (
        <p className="text-sm text-gray-400 italic">No questions generated yet.</p>
      )}

      {faqs.length > 0 && (
        <ul className="space-y-2">
          {faqs.map((q, i) => (
            <li
              key={i}
              className="text-sm text-gray-800 bg-gray-50 border border-gray-200 rounded-md px-3 py-2"
            >
              {q.text}
              {q.keyPhrase && (
                <span className="ml-2 text-xs text-purple-600 bg-purple-50 border border-purple-200 rounded px-1.5 py-0.5">
                  {q.keyPhrase}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
