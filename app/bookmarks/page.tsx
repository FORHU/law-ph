import { Suspense } from 'react';
import { BookmarksPage } from '@/components/bookmarks-page';

export default function Page() {
  return (
    <Suspense>
      <BookmarksPage />
    </Suspense>
  );
}
