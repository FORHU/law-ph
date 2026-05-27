import { Suspense } from 'react';
import { SearchPage } from '@/components/search-page';

export const metadata = {
  title: 'Search',
  description: 'Search through your past consultations and cases by keyword.',
};

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
