import { execSync } from 'child_process'

if (process.env.VERCEL_ENV === 'production') {
  console.log('Production deploy — running prisma migrate deploy...')
  execSync('prisma migrate deploy', { stdio: 'inherit' })
} else {
  console.log(`Skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? 'local'})`)
}
