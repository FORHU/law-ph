export default function AuthLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="flex items-center gap-3">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <span className="text-sm text-white">Checking session…</span>
      </div>
    </div>
  );
}
