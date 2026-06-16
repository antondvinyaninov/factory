"use client"

import Image from "next/image"
import { LoginForm } from "@/components/login-form"
import { TypographySmall } from "@/components/ui/typography"

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center">
          <Image
            src="/logo-portal.svg"
            alt="Логотип Factory 1.0"
            width={128}
            height={32}
            priority
            className="h-8 w-auto"
          />
          <TypographySmall>Factory 1.0</TypographySmall>
        </a>
        <LoginForm />
      </div>
    </div>
  )
}
