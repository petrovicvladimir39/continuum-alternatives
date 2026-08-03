import Link from "next/link";

/** Wordmark logo in the template's logo slot — no image asset needed. */
export function LandingLogo() {
  return (
    <Link
      href="/"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
    >
      <span className="inline-block h-5 w-5 rounded-br-lg rounded-tl-lg bg-black dark:bg-white" />
      <span className="font-medium text-black dark:text-white">Continuum</span>
    </Link>
  );
}
