'use client'

import ConsultationScreen from "@/components/consultation";

export default function ConsultationLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // ConsultationScreen lives in the layout (not in each page) so it stays mounted
  // when Next.js transitions between /consultation and /consultation/:id.
  // If it were in the page components, the route switch unmounts and remounts it,
  // briefly resetting local state → visible flicker. The page children (both null)
  // are rendered but invisible; ConsultationScreen handles the full UI.
  return (
    <>
      <ConsultationScreen />
      <div style={{ display: 'none' }}>{children}</div>
    </>
  );
}
