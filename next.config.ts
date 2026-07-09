import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Evita que o Next confunda a raiz do workspace com o diretório pai
  // (C:\Integração), que tem um projeto Node.js legado não relacionado.
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
