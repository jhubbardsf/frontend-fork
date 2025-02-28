/** @type {import('next').NextConfig} */
const config = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true, // TODO: Fix ESLint errors on build and delete this
    },
    images: {
        domains: ['utfs.io'],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'picsum.photos',
            },
            {
                protocol: 'https',
                hostname: 'utfs.io',
            },
        ],
    },
};

module.exports = config;
