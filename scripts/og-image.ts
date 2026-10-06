/**
 * Generates src/assets/og-image.jpg, the social preview image, by screenshotting the card
 * in src/dev/og-image.astro with headless Chrome. The card is only served while this runs.
 *
 *   npm run og-image
 *
 * Set CHROME to the Chrome binary if it isn't in the default macOS location.
 */
import { execFile } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { dev } from "astro";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT = "src/assets/og-image.jpg";
const WIDTH = 1200;
const HEIGHT = 630;

const server = await dev({
  logLevel: "error",
  devToolbar: { enabled: false },
  integrations: [
    {
      name: "og-image",
      hooks: {
        "astro:config:setup": ({ injectRoute }) => {
          injectRoute({ pattern: "/og-image", entrypoint: "./src/dev/og-image.astro" });
        },
      },
    },
  ],
});

rmSync(OUTPUT, { force: true });
try {
  // Must not block: the dev server answering Chrome runs in this process.
  await promisify(execFile)(CHROME, [
    "--headless",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    // Light theme, whatever the OS appearance is.
    "--blink-settings=preferredColorScheme=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${resolve(OUTPUT)}`,
    `http://localhost:${server.address.port}/og-image`,
  ]);
} finally {
  await server.stop();
}

if (!existsSync(OUTPUT)) throw new Error(`Chrome didn't write ${OUTPUT}`);
console.log(`Wrote ${OUTPUT}`);
