import { PageLoader } from '@/components/ui/page-loader';

export default function AuthLoading() {
  return (
    <div className="flex h-screen items-center justify-center">
      <PageLoader label="Checking session..." />
    </div>
  );
}
