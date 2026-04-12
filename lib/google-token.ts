/**
 * Refreshes a Google OAuth access token using the stored refresh token.
 * Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in env vars.
 */
export async function refreshGoogleAccessToken(refreshToken: string): Promise<string | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('[google-token] GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is not set.');
    return null;
  }

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[google-token] Token refresh failed:', err);
    return null;
  }

  const data = await res.json();
  return data.access_token ?? null;
}
