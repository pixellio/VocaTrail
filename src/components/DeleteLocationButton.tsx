'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2, Loader2 } from 'lucide-react';

interface Props {
  locationId: string;
  locationName: string;
}

export default function DeleteLocationButton({ locationId, locationName }: Props) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/locations/${locationId}`, { method: 'DELETE' });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete location.');
      }
      router.push('/vendor');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete location.');
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
      >
        <Trash2 size={14} />
        Delete location
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-gray-700">
        Delete <strong>{locationName}</strong>? This also removes its QR code and generated questions.
      </span>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
      >
        {deleting && <Loader2 size={14} className="animate-spin" />}
        Confirm delete
      </button>
      <button
        onClick={() => setConfirming(false)}
        disabled={deleting}
        className="text-sm text-gray-500 hover:underline"
      >
        Cancel
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
