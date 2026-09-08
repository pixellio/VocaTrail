import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
        <span>&copy; {new Date().getFullYear()} VoxaBoard</span>
        <nav className="flex items-center gap-x-6">
          <Link href="/" className="hover:text-gray-800">
            Home
          </Link>
          <Link href="/privacy" className="hover:text-gray-800">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-gray-800">
            Terms of Service
          </Link>
          <Link href="/vendor" className="hover:text-gray-800">
            Become a partner
          </Link>
        </nav>
      </div>
    </footer>
  );
}
