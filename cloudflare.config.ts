import { bindings, defineConfig, defineWorker } from "cf/config";

export default defineConfig({
  worker: defineWorker({
    name: "caption-engine",
    entrypoint: "vinext/server/fetch-handler",
    compatibilityDate: "2026-11-24",
    compatibilityFlags: ["nodejs_compat", "global_fetch_strictly_public"],
    domains: ["c.uniquestorebd.top"],
    assets: {
      htmlHandling: "none",
      notFoundHandling: "none",
      runWorkerFirst: ["/*", "!/_next/static/*", "!/*/_next/static/*"],
    },
    env: {
      ASSETS: bindings.assets(),
      IMAGES: bindings.images(),
      DB: bindings.d1({ name: "caption-engine-db" }),
      MEDIA: bindings.r2({ name: "caption-engine-media" }),
      BROWSER: bindings.browser(),
      STORE_WORKER: bindings.worker({ worker: "unique-store-bd" }),
      GEMINI_API_KEY: bindings.secret(),
      GEMINI_MODEL: bindings.secret(),
      INTERNAL_JOB_TOKEN: bindings.secret(),
      PRODUCT_API_TOKEN: bindings.secret(),
      ADMIN_KEY: bindings.secret(),
      MOD_KEY: bindings.secret(),
      AUTH_SECRET: bindings.secret(),
    },
  }),
});
