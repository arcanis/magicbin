const withTM = require(`next-transpile-modules`)([`graphql-ws`]);

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    workerThreads: true,
  },
};

module.exports = withTM(config);
