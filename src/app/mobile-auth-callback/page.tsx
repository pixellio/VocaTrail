// Fallback page for the mobile login handoff. Normally this URL is a
// verified Android App Link, so the OS opens the Voxaboard app directly
// instead of ever loading this page — see google/callback/route.ts and the
// app's app.json intentFilters. This only renders if App Link verification
// hasn't taken effect yet (e.g. a very fresh install), so it just tells the
// person what to do instead of showing a bare 404.
export default function MobileAuthCallbackPage() {
  return (
    <main style={{ maxWidth: 480, margin: '80px auto', padding: 24, textAlign: 'center' }}>
      <h1 style={{ fontSize: 20, marginBottom: 12 }}>Return to the Voxaboard app</h1>
      <p style={{ color: '#555', lineHeight: 1.5 }}>
        Sign-in is almost done — open the Voxaboard mobile app to finish. If it doesn&apos;t open
        automatically, switch to it manually from your recent apps.
      </p>
    </main>
  );
}
