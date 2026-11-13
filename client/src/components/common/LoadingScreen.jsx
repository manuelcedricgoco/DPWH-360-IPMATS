export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-canvas" role="status" aria-live="polite">
      <div className="relative h-16 w-16">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-navy-100 border-t-signal-600 [animation-duration:1.1s]" aria-hidden="true" />
        <img src="/images/dpwh-logo.jpg" alt="" className="absolute inset-2 h-12 w-12 rounded-full object-contain" />
      </div>
      <span className="text-sm font-medium text-ink-2">{message}</span>
    </div>
  );
}
