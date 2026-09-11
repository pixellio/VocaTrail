import { Lock } from 'lucide-react';

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: 'Sign-in expired or was tampered with. Please try again.',
  token_exchange_failed: 'Google sign-in failed. Please try again.',
  unverified_email: "Your Google account's email isn't verified.",
  not_allowed: "This Google account isn't authorized for the vendor dashboard.",
  session_unconfigured: 'Vendor sign-in is not configured on the server.',
};

export default async function VendorLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] ?? 'Something went wrong. Please try again.' : null;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-purple-100 rounded-full mb-3">
            <Lock size={24} className="text-purple-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-800">Location Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in with your vendor Google account to continue.</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <a
          href="/api/auth/google/login?intent=vendor&returnTo=/vendor"
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path
              fill="#4285F4"
              d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62Z"
            />
            <path
              fill="#34A853"
              d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
            />
            <path
              fill="#FBBC05"
              d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z"
            />
            <path
              fill="#EA4335"
              d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
            />
          </svg>
          <span>Sign in with Google</span>
        </a>
      </div>
    </div>
  );
}
