import Image from 'next/image'
import Link from 'next/link'
import Button from '@/components/ui/Button'

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/80 backdrop-blur-sm">
      <div className="container-app flex h-16 items-center justify-between">
        <Link href="/">
          <Image
            src="/logo-app.png"
            alt="Worklyn"
            width={160}
            height={36}
            className="h-[36px] w-auto"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-gray-600 hover:text-gray-900">
            Features
          </Link>
          <Link href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">
            Pricing
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              Sign in
            </Button>
          </Link>
          <Link href="/auth/signup">
            <Button size="sm">Get started</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
