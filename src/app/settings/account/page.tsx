import { LogIn } from 'lucide-react';

export default function AccountSettingsPage() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <LogIn size={28} className="text-gray-400" />
      </div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Not signed in</h2>
      <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
        Google sign-in is being configured for VoxaBoard. Once it&apos;s ready, you&apos;ll be
        able to log in here — logging in stays optional for using the board itself.
      </p>
      <button
        disabled
        title="Google sign-in is being configured — coming soon"
        className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
      >
        Log in with Google (coming soon)
      </button>
    </div>
  );
}
