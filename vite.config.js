import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { copyFileSync, existsSync } from "node:fs";

// Static hosts like GitHub Pages can't rewrite /fleet or /book to the app.
// Copying index.html to 404.html makes those links (and page refreshes) load the app anyway.
const spaFallback = () => ({
  name: "spa-404-fallback",
  closeBundle() {
    if (existsSync("dist/index.html")) copyFileSync("dist/index.html", "dist/404.html");
  }
});

// Base is "/" by default (same as before). Only set VITE_BASE=/repo-name/ if the site lives in a sub-folder.
export default defineConfig({ base: process.env.VITE_BASE || "/", plugins: [react(), spaFallback()] });
