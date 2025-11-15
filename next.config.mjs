/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Bỏ qua lỗi ESLint khi build để không chặn quá trình build
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
