/**
 * Generates src/assets/og-image.jpg, the social preview image, by screenshotting the card
 * in src/dev/og-image.astro with headless Chrome. The card is only served while this runs.
 *
 *   npm run og-image
 *
 * Set CHROME to the Chrome binary if it isn't in the default macOS location.
 */
import { execFile } from "node:child_process";
import { copyFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { dev } from "astro";

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const OUTPUT = "src/assets/og-image.jpg";
// The site imports OUTPUT, so the dev server errors if it goes missing mid-run. Chrome writes here first.
const SCREENSHOT = join(tmpdir(), `og-image-${process.pid}.jpg`);
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

try {
  // Must not block: the dev server answering Chrome runs in this process.
  await promisify(execFile)(CHROME, [
    "--headless",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    // Light theme, whatever the OS appearance is.
    "--blink-settings=preferredColorScheme=1",
    `--window-size=${WIDTH},${HEIGHT}`,
    `--screenshot=${SCREENSHOT}`,
    `http://localhost:${server.address.port}/og-image`,
  ]);
} finally {
  await server.stop();
}

if (!existsSync(SCREENSHOT)) throw new Error(`Chrome didn't write ${SCREENSHOT}`);
copyFileSync(SCREENSHOT, OUTPUT);
rmSync(SCREENSHOT);
console.log(`Wrote ${OUTPUT}`);
