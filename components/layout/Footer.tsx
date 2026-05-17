import Link from 'next/link'
import Image from 'next/image'

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 bg-white">
      <div className="container-app py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/">
              <Image src="/logo-app.png" alt="Worklyn" width={140} height={32} className="h-8 w-auto" />
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-gray-500">
              Operational infrastructure for Australian allied health providers.
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              NDIS Ready · Australian Made
            </span>
          </div>

          {/* Product */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Product</p>
            <ul className="space-y-3">
              <li><Link href="/features" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Features</Link></li>
              <li><Link href="/pricing" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Pricing</Link></li>
              <li><Link href="/auth/signup" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Start free trial</Link></li>
              <li><Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Sign in</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Company</p>
            <ul className="space-y-3">
              <li><Link href="/about" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">About</Link></li>
              <li><Link href="/contact" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Contact</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-gray-400">Legal</p>
            <ul className="space-y-3">
              <li><Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 flex flex-col items-center justify-between gap-2 sm:flex-row">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Worklyn Pty Ltd. All rights reserved.
          </p>
          <p className="text-xs text-gray-400">Built for Allied Health · Australia</p>
        </div>
      </div>
    </footer>
  )
}
