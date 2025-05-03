/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({ enabled: true }) 
  : (config) => config;

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true
});

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'cdn-icons-png.flaticon.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
    // ფოტოების ოპტიმიზაციის გაუმჯობესება
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
  },
  // ჰიდრაციის გაფრთხილებების გამოსწორება
  experimental: {
    // ჰიდრაციის შეცდომების უგულებელყოფისთვის
    strictNextHead: true,
    // ოპტიმიზებული middleware
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@emotion/react',
      '@emotion/styled',
    ],
  },
  // ემოციების CSS ოპტიმიზაცია
  compiler: {
    emotion: true,
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Vercel-ზე აპლიკაციის ოპტიმიზაცია
  poweredByHeader: false,
  compress: true,
  // გზათა ოპტიმიზაცია
  output: 'standalone',
};

module.exports = withBundleAnalyzer(withPWA(nextConfig)); 