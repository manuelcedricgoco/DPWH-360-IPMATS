export default function LoadingScreen({ message = 'Loading…' }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex items-center gap-3 text-slate-600">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-dpwh-blue" />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
