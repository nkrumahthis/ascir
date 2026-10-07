import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function SignInPage() {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-center gap-2 md:justify-start">
          <Link href="/" aria-label="ASCIR home">
            <Image src="/ascir/logo.png" alt="ASCIR logo" width={120} height={63} priority />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            {/* LoginForm reads ?next= via useSearchParams */}
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <Image
          src="/ascir/ghana-china-development.jpeg"
          alt=""
          fill
          sizes="50vw"
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b3f32]/90 via-[#0b3f32]/20 to-transparent" />
        <p className="absolute inset-x-10 bottom-10 max-w-md font-heading text-2xl leading-snug text-white">
          Independent China–Africa policy research and analysis from Accra, Ghana.
        </p>
      </div>
    </div>
  );
}
