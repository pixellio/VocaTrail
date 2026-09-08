import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - VoxaBoard',
  description: 'The terms that govern your use of VoxaBoard.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
        <Link href="/" className="text-sm text-blue-600 hover:underline">
          ← Back to VoxaBoard
        </Link>

        <h1 className="text-3xl font-bold text-gray-800 mt-4 mb-1">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Effective date: September 8, 2026</p>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 space-y-8 text-gray-700 leading-relaxed">
          <section>
            <p>
              These Terms of Service (&quot;Terms&quot;) govern your use of VoxaBoard, an
              Augmentative and Alternative Communication (AAC) utility app operated by Pixellio
              (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). By accessing or using VoxaBoard,
              you agree to these Terms. If you are using VoxaBoard on behalf of someone else —
              for example as a parent, guardian, caregiver, or clinician — you agree to these
              Terms on that person&apos;s behalf as well.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">1. What VoxaBoard is</h2>
            <p>
              VoxaBoard helps individuals with communication difficulties express themselves using
              visual cards, text-to-speech, phrase interpretation, and location-based (QR-triggered)
              vocabulary generation. VoxaBoard is a communication aid, not a medical device.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">2. Not a substitute for professional care</h2>
            <p>
              VoxaBoard is intended to be used under the guidance of a physician, speech-language
              pathologist, or other qualified clinician. It does not diagnose, treat, or provide
              medical advice, and it is not a substitute for professional clinical assessment or
              care. Any decisions about a user&apos;s communication plan, therapy, or treatment
              should be made in consultation with a qualified professional.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">3. No advertising</h2>
            <p>
              VoxaBoard does not display ads and does not integrate with ad networks. We do not
              sell user information to advertisers or any other third party (see our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              ).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">4. Your content</h2>
            <p>
              You retain ownership of the cards, phrases, and other content you create in
              VoxaBoard. By using VoxaBoard, you give us permission to store and process that
              content solely to operate the app for you — including generating vocabulary boards
              and improving board accuracy as described in our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              . You are responsible for the content you create and for making sure it is
              appropriate for its intended use.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">5. Acceptable use</h2>
            <p className="mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use VoxaBoard for any unlawful purpose or in violation of these Terms.</li>
              <li>Attempt to disrupt, reverse engineer, or interfere with VoxaBoard&apos;s operation or security.</li>
              <li>Use VoxaBoard to generate or store content that is abusive, harmful, or infringes on others&apos; rights.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">6. Third-party services</h2>
            <p>
              VoxaBoard uses Google&apos;s Gemini API to interpret phrases and to match generated
              concepts against your existing cards. Use of this feature is subject to the
              disclosures in our{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
              . We are not responsible for the availability or accuracy of third-party services we
              rely on.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">7. Disclaimer of warranties</h2>
            <p>
              VoxaBoard is provided &quot;as is&quot; and &quot;as available,&quot; without
              warranties of any kind, express or implied, including that it will be uninterrupted,
              error-free, or that generated boards or interpretations will always be accurate.
              Communication accuracy can depend on many factors, including the quality of the
              phrase or QR content provided.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">8. Limitation of liability</h2>
            <p>
              To the fullest extent permitted by law, Pixellio and VoxaBoard will not be liable for
              any indirect, incidental, or consequential damages arising from your use of, or
              inability to use, VoxaBoard, including reliance on any generated card, phrase
              interpretation, or vocabulary board. VoxaBoard should not be relied upon in situations
              where inaccurate or delayed communication could result in harm; seek immediate
              assistance through appropriate emergency channels when needed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">9. Changes to VoxaBoard or these Terms</h2>
            <p>
              We may update VoxaBoard or these Terms from time to time. If we make material
              changes to these Terms, we will update the effective date above. Continued use of
              VoxaBoard after a change means you accept the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">10. Governing law</h2>
            <p>
              These Terms are governed by the laws applicable where Pixellio operates, without
              regard to conflict-of-law principles, except where local law requires otherwise.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">11. Contact us</h2>
            <p>
              Questions about these Terms can be sent to{' '}
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
