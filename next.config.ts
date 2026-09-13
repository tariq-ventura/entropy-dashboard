import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // El dashboard es un panel de operación: nada de lo que muestra debe quedar
  // cacheado entre peticiones. El cacheo se controla llamada por llamada en
  // lib/entropy.ts con cache: "no-store".
  poweredByHeader: false,
};

export default nextConfig;
