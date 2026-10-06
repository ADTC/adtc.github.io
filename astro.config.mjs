// @ts-check
import { defineConfig, fontProviders } from "astro/config";

// https://astro.build/config
export default defineConfig({
  site: "https://adtc.github.io",
  build: { inlineStylesheets: "always" },
  fonts: [
    {
      provider: fontProviders.fontsource(),
      name: "Inter",
      cssVariable: "--font-sans",
      // Static weights, not the variable font: Chrome prints variable fonts to PDF as Type 3
      // glyphs, and text copied from those PDFs comes out broken.
      weights: [400, 500, 600, 700],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["sans-serif"],
    },
    {
      provider: fontProviders.fontsource(),
      name: "Instrument Serif",
      cssVariable: "--font-serif",
      weights: [400],
      styles: ["normal"],
      subsets: ["latin"],
      fallbacks: ["serif"],
    },
  ],
});
