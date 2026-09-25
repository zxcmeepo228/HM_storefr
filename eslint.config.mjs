import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";

const baseDirectory = fileURLToPath(new URL(".", import.meta.url));
const compat = new FlatCompat({ baseDirectory });

const config = [
  ...compat.extends("next/core-web-vitals"),
  { ignores: [".next/**", "out/**", "build/**", "next-env.d.ts"] },
  { rules: { "@next/next/no-img-element": "off" } },
];

export default config;
