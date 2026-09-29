import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#F8FAFC] text-slate-900">
      <h2 className="text-2xl font-bold mb-2">Page Not Found</h2>
      <p className="text-slate-600 mb-4">Could not find requested resource</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-xl bg-[#1E3A8A] text-white font-medium hover:bg-[#1E40AF] transition-colors"
      >
        Return Home
      </Link>
    </div>
  );
}
