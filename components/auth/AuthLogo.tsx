'use client'

import Image from 'next/image'
import Link from 'next/link'

export default function AuthLogo() {
  return (
    <div className="flex justify-center mb-6">
      <Link href="/">
        <div className="bg-white p-4 rounded-xl shadow-sm inline-block">
          <Image
            src="/logo-auth-v2.png"
            alt="Worklyn"
            width={300}
            height={100}
            className="h-[100px] w-auto mx-auto"
            priority
          />
        </div>
      </Link>
    </div>
  )
}
