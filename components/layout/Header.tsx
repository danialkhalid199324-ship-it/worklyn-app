import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="container-app flex h-20 items-center justify-between">
        <Link href="/" className="shrink-0">
          <Image
            src="/logo-app.png"
            alt="Worklyn"
            width={160}
            height={40}
            className="h-[40px] w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Link
            href="/features"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Features
          </Link>
          <Link
            href="/pricing"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            Contact
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">Get started free</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
