'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Upload } from 'lucide-react';
import type { LocationDetail } from '@/lib/locationsDatabase';

interface Props {
  location: LocationDetail;
}

export default function EditLocationForm({ location }: Props) {
  const router = useRouter();
  const [name, setName] = useState(location.name);
  const [instructions, setInstructions] = useState(location.instructions);
  const [contactName, setContactName] = useState(location.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(location.contact_email ?? '');
  const [contactPhone, setContactPhone] = useState(location.contact_phone ?? '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [clearLogo, setClearLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    setLogoPreview(file ? URL.createObjectURL(file) : null);
    if (file) setClearLogo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !instructions.trim()) {
      setError('Name and instructions are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.set('name', name.trim());
      formData.set('instructions', instructions.trim());
      formData.set('contact_name', contactName.trim());
      formData.set('contact_email', contactEmail.trim());
      formData.set('contact_phone', contactPhone.trim());
      if (logoFile) formData.set('logo', logoFile);
      if (clearLogo) formData.set('clear_logo', 'true');

      const response = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        body: formData,
      });
      const result = await response.json();

      if (result.success) {
        router.push(`/vendor/${location.id}`);
        router.refresh();
      } else {
        setError(result.error || 'Failed to update location.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Location name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Instructions *</label>
        <textarea
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
        />
        <p className="text-xs text-gray-500 mt-1">
          Changing this automatically regenerates the AAC sample questions below, since the old ones
          would otherwise no longer match.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact name</label>
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact email</label>
          <input
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contact phone</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-800"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 px-4 py-2 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 text-sm text-gray-600">
            <Upload size={16} />
            {location.has_logo ? 'Replace file' : 'Choose file'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoChange}
              className="hidden"
            />
          </label>
          {logoPreview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoPreview} alt="Logo preview" className="w-12 h-12 object-contain rounded border border-gray-200" />
          )}
          {!logoPreview && location.has_logo && !clearLogo && (
            <button
              type="button"
              onClick={() => setClearLogo(true)}
              className="text-sm text-red-600 hover:underline"
            >
              Remove current logo
            </button>
          )}
          {clearLogo && <span className="text-sm text-gray-500">Logo will be removed</span>}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting && <Loader2 size={18} className="animate-spin" />}
        <span>Save changes</span>
      </button>
    </form>
  );
}
