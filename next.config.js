/**
 * @param {string[]} hostnames
 * @returns {protocol: string, hostname: string}[]
 */
const buildRemotePatterns = (hostnames) => {
    return hostnames.map((hostname) => {
        return {
            protocol: 'https',
            hostname,
        };
    });
};

/** @type {import('next').NextConfig} */
const config = {
    reactStrictMode: true,
    eslint: {
        ignoreDuringBuilds: true, // TODO: Fix ESLint errors on build and delete this
    },
    images: {
        domains: ['utfs.io'],
        remotePatterns: buildRemotePatterns([
            'picsum.photos',
            'utfs.io',
            'assets.coingecko.com',
            'coin-images.coingecko.com',
            'ethereum-optimism.github.io',
            'arbitrum.foundation',
            'raw.githubusercontent.com',
            's2.coinmarketcap.com',
            'basescan.org',
            'dynamic-assets.coinbase.com',
        ]),
    },
};

module.exports = config;
