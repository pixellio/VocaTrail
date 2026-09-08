import { User } from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <User size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">You&apos;re not signed in yet</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Sign in to save your board and settings across devices. Google sign-in is being set up —
        this will be enabled soon.
      </p>
      <button
        disabled
        title="Google sign-in is being configured — coming soon"
        className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
      >
        Sign in with Google (coming soon)
      </button>
    </div>
  );
}
