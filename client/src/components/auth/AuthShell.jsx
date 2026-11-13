import { AGENCY, PROVINCE, SHORT_NAME, TITLE_REST } from '../../lib/brand.js';

/**
 * Branded frame for login, registration and pending pages: the DPWH background
 * photo under a navy overlay, the complete official system title on the left
 * (top on mobile) and the form card on the right.
 */
export default function AuthShell({ children, wide = false }) {
  return (
    <div className="relative isolate min-h-screen overflow-hidden bg-navy-950">
      <img
        src="/images/dpwh-background.webp"
        alt=""
        className="absolute inset-0 -z-20 h-full w-full scale-105 object-cover blur-[3px]"
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgb(11_20_56/0.96)_0%,rgb(17_29_85/0.9)_45%,rgb(26_40_120/0.78)_100%)]"
        aria-hidden="true"
      />

      <div className="mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:py-12">
        <section className="text-white">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white p-1 shadow-[0_0_0_6px_rgb(255_255_255/0.08)] lg:h-24 lg:w-24">
              <img src="/images/dpwh-logo.jpg" alt={`${AGENCY} logo`} className="h-full w-full rounded-full object-contain" />
            </span>
            <p className="max-w-[16rem] text-sm leading-snug text-navy-100 lg:text-base">
              {AGENCY}
              <span className="block text-navy-200/80">{PROVINCE}</span>
            </p>
          </div>

          {/* The complete official title: the short name set large, the rest beneath it. */}
          <h1 className="mt-8 lg:mt-12">
            <span className="block font-display text-[3.4rem] leading-[0.92] font-semibold tracking-[0.005em] sm:text-[4.5rem] lg:text-[6rem]">
              {SHORT_NAME}
            </span>
            <span className="mt-5 block max-w-[34rem] font-display text-[1.3rem] leading-[1.25] font-medium text-navy-100 sm:text-[1.6rem]">
              {TITLE_REST}
            </span>
          </h1>
          <span className="mt-7 block h-1 w-16 rounded-full bg-signal-500" aria-hidden="true" />
        </section>

        <section className={`w-full justify-self-center lg:justify-self-end ${wide ? 'max-w-xl' : 'max-w-md'}`}>
          <div className="animate-page rounded-2xl bg-white p-6 shadow-[0_32px_80px_-24px_rgb(0_0_0/0.55)] sm:p-8">
            {children}
          </div>
          <p className="mt-5 text-center text-xs text-navy-200/80">
            Official monitoring portal of DPWH projects in {PROVINCE}
          </p>
        </section>
      </div>
    </div>
  );
}
