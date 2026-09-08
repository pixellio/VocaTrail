import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - VoxaBoard',
  description: 'How VoxaBoard collects, uses, and protects your information.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to VoxaBoard
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mt-4 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Effective date: September 8, 2026</p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <p>
              VoxaBoard (&quot;VoxaBoard,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) is an Augmentative
              and Alternative Communication (AAC) utility app operated by Pixellio. This Privacy
              Policy explains what information VoxaBoard collects, how it is used, and the choices
              you have. By using VoxaBoard, you agree to the practices described here.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">1. We do not sell your information</h2>
            <p>
              We do not sell, rent, or trade your personal information, your communication cards,
              or your usage data to advertisers, data brokers, or any other third party. VoxaBoard
              has no ad network integrated into the app, and we do not build advertising profiles
              from your activity.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">2. Information we collect</h2>
            <p className="mb-2">VoxaBoard is designed to collect only what is needed to build and maintain your communication board:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>
                <strong>Communication cards</strong> — the text, symbols, categories, and colors of
                the cards you create, edit, or receive from the app.
              </li>
              <li>
                <strong>Phrases and location context</strong> — text you type to interpret a phrase,
                and the content of any location-based QR code you scan (for example, instructions or
                context tied to a place). We refer to this as &quot;location context&quot; — VoxaBoard
                does not access GPS or device location; the only location signal we receive is what a
                scanned QR code or typed phrase contains.
              </li>
              <li>
                <strong>Generated boards</strong> — the vocabulary boards VoxaBoard produces from the
                above (concepts, matched cards, and confidence scores).
              </li>
              <li>
                <strong>Camera access</strong> — used only locally in your browser to decode a QR code
                you point the camera at. Video frames are processed on your device and are never
                uploaded, stored, or transmitted to us.
              </li>
            </ul>
            <p className="mt-2">
              VoxaBoard does not currently require you to create an account, and we do not ask for
              your name, address, or other identifying details unless you choose to type them into a
              card yourself.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">3. How we use location context and generated boards</h2>
            <p>
              We may use the location context you provide (such as scanned QR content) together with
              the vocabulary boards generated from it to understand how well VoxaBoard&apos;s matching
              and interpretation is working, and to improve the accuracy of future generated boards —
              for example, tuning how confidently a generated concept is matched to a card you already
              own. This information is used to improve VoxaBoard itself, not to build advertising
              profiles or to identify you personally to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">4. Third-party processing</h2>
            <p>
              To interpret phrases and to match new concepts to your existing cards, VoxaBoard sends
              the relevant text (the phrase or scanned content, and the text of your existing cards)
              to Google&apos;s Gemini API for language interpretation and text embeddings. This
              processing happens through our server so your API credentials are never exposed, and
              this data is used only to generate a response to your request — not for Google&apos;s
              advertising purposes, and not shared with any other third party by us. No other
              third-party analytics or advertising SDKs are integrated into VoxaBoard.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">5. No advertising</h2>
            <p>
              VoxaBoard contains no ads, and we do not partner with ad networks. There is nothing in
              the app that monetizes your attention or data through advertising.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">6. Data storage and security</h2>
            <p>
              Your cards and generated boards are stored in a database operated by us (or, in some
              deployments, held only in memory for the duration of your session). We take reasonable
              technical measures to protect this data but no method of storage or transmission is
              completely secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">7. Children&apos;s privacy and clinical use</h2>
            <p>
              VoxaBoard is often used by children and individuals with communication disabilities,
              typically with the support of a parent, guardian, caregiver, or clinician. We do not
              knowingly use any child&apos;s information for advertising, and we do not sell any
              user&apos;s information regardless of age. VoxaBoard is a communication tool, not a
              medical device, and should be used under the guidance of a physician, speech-language
              pathologist, or other qualified clinician — see our{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              for more on this.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">8. Your choices</h2>
            <p>
              You can edit or delete any card you have created at any time within the app. If you
              would like data associated with your use of VoxaBoard deleted, contact us using the
              details below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">9. Changes to this policy</h2>
            <p>
              We may update this Privacy Policy from time to time. If we make material changes,
              we will update the effective date above. Continued use of VoxaBoard after a change
              means you accept the updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">10. Contact us</h2>
            <p>
              If you have questions about this Privacy Policy or how your information is handled,
              contact us at{' '}
              <a href="mailto:help.voxaboard@gmail.com" className="text-blue-600 hover:underline">
                help.voxaboard@gmail.com
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
