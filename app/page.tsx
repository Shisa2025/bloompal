"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import DesktopOnly from "./components/DesktopOnly";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!window.matchMedia("(min-width: 1024px)").matches) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      router.replace("/login");
    }, 2500);

    return () => window.clearTimeout(redirectTimer);
  }, [router]);

  return (
    <DesktopOnly>
      <div className="flex min-h-screen flex-1 items-center justify-center bg-[#fbfaf4] px-10 py-16 font-sans text-[#1d2b22]">
        <main
          className="flex w-full max-w-md flex-col items-center gap-9 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="flower-loader" aria-hidden="true">
            <span className="flower-petal" />
            <span className="flower-petal" />
            <span className="flower-petal" />
            <span className="flower-petal" />
            <span className="flower-petal" />
            <span className="flower-petal" />
            <span className="flower-petal" />
            <span className="flower-petal" />
            <span className="flower-core" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium uppercase text-[#52735a]">
              BloomPal
            </p>
            <h1 className="max-w-md text-4xl font-semibold leading-10 text-[#1d2b22]">
              Preparing your plant care space...
            </h1>
          </div>

          <div className="flex w-full max-w-sm flex-col gap-3" aria-hidden="true">
            <div className="loading-skeleton h-5 w-3/4" />
            <div className="loading-skeleton h-5 w-full" />
            <div className="loading-skeleton h-5 w-5/6" />
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div className="loading-skeleton h-20" />
              <div className="loading-skeleton h-20" />
              <div className="loading-skeleton h-20" />
            </div>
          </div>
        </main>
      </div>
    </DesktopOnly>
  );
}
