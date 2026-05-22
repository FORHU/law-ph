import { Suspense } from 'react';
import { GeneralConfig } from '@/components/settings/general-config';

export default function GeneralConfigPage() {
  return (
    <Suspense>
      <GeneralConfig />
    </Suspense>
  );
}
