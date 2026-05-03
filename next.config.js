/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer', 'resend', 'svix', 'postal-mime'],
  },
}

module.exports = nextConfig
