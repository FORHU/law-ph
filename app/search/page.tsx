import { Suspense } from 'react';
import { SearchPage } from '@/components/search-page';

export const metadata = {
  title: 'Search Chats | Lex',
  description: 'Search through your past consultations by keyword.',
};

export default function Page() {
  return (
    <Suspense>
      <SearchPage />
    </Suspense>
  );
}
