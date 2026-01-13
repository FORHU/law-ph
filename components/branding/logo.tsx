'use client';

import Image from "next/image";

export function Logo() {


  return (
    <div className="relative h-10 w-30">
        <Image
          src="/logo-light.png"
          alt="Logo"
         fill
          className="block dark:hidden object-contain"
          priority
        />
        <Image
          src="/logo-dark.png"
          alt="Logo"
          fill
          className="hidden dark:block object-contain"
          priority
        />
      </div>
  );
}
