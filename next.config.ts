import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Resume PDFs go through submitApplicationAction (≤ 5 MB + form overhead); default limit is 1 MB.
  experimental: { serverActions: { bodySizeLimit: '6mb' } },
};

export default nextConfig;
