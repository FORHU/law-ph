"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense, use } from "react";
import { useTranslation } from "@/lib/i18n/language-provider";

function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = use(searchParams);
  const { t } = useTranslation();

  return (
    <>
      {params?.error ? (
        <p className="text-sm text-muted-foreground">
          {t('auth.errorPage.codeErrorPrefix')} {params.error}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {t('auth.errorPage.unspecified')}
        </p>
      )}
    </>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                {t('auth.errorPage.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense>
                <ErrorContent searchParams={searchParams} />
              </Suspense>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
