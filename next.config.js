/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Keep image delivery platform-neutral for both Vercel and OpenNext/Cloudflare.
    unoptimized: true,
  },
}

module.exports = nextConfig
