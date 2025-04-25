import { defineConfig } from "vite"

export default defineConfig({
  root: ".", // 👈 important if index.html is in root
  base: "/judokon/", // 👈 required for GitHub Pages
})