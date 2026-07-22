"use client";

import { PageLoader } from '@/components/ui/page-loader';
import { useTranslation } from '@/lib/i18n/language-provider';

export default function AuthLoading() {
  const { t } = useTranslation();
  return (
    <div className="flex h-screen items-center justify-center">
      <PageLoader label={t('auth.loading.checkingSession')} />
    </div>
  );
}
