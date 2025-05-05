/** @type {import('next').NextConfig} */
const withBundleAnalyzer = process.env.ANALYZE === 'true' 
  ? require('@next/bundle-analyzer')({ enabled: true }) 
  : (config) => config;

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true
});

// next-intl-ის კონფიგურაცია გამორთულია დროებით
// შემდგომში შეგვიძლია დავამატოთ მრავალენოვანი მხარდაჭერა 

const nextConfig = {
  reactStrictMode: true,
  // გავაუმჯობესოთ ჩატვირთვის სიჩქარე
  swcMinify: true,
  compiler: {
    emotion: true,
    // წავშალოთ კონსოლები პროდაქშენში
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // გაუმჯობესებული გამოსახულებების ოპტიმიზაცია
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
    minimumCacheTTL: 86400, // 24 საათი (წამებში)
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    domains: ['firebasestorage.googleapis.com', 'placehold.co']
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
    // გავაუმჯობესოთ ჩატვირთვა
    optimizeCss: true,
    swcFileReading: true,
    webVitalsAttribution: ['CLS', 'LCP'],
  },
  // Vercel-ზე აპლიკაციის ოპტიმიზაცია
  poweredByHeader: false,
  compress: true,
  // გზათა ოპტიმიზაცია
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true, // დროებით გამორთულია ტიპების შემოწმება
  },
  eslint: {
    ignoreDuringBuilds: true, // დროებით გამორთულია ESLint შემოწმება
  },
  // გავაუმჯობესოთ ინიციალიზაცია
  onDemandEntries: {
    // 25 წამი პერიოდი, როდესაც გვერდები რჩება მეხსიერებაში
    maxInactiveAge: 25 * 1000,
    // 10 გვერდი დროის ერთეულში
    pagesBufferLength: 10,
  },
};

// დროებით გაუქმებულია next-intl-ის კონფიგურაცია
module.exports = withPWA(withBundleAnalyzer(nextConfig)); 