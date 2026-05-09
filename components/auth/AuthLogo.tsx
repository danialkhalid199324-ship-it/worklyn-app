'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function AuthLogo() {
  return (
    <div className="flex justify-center mb-6">
      <Link href="/">
        <Image
          src="/logo-app.png"
          alt="Worklyn"
          width={160}
          height={36}
          className="h-[48px] w-auto"
          priority
        />
      </Link>
    </div>
  )
}
