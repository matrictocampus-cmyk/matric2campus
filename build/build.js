// build/build.js
const esbuild = require("esbuild");

esbuild.build({
  entryPoints: ["@supabase/supabase-js"],
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["chrome100"],
  outfile: "../extension/vendor/supabase.bundle.js",
  sourcemap: false,
  minify: true,
}).then(() => {
  console.log("✅ Supabase bundled successfully");
}).catch((err) => {
  console.error(err);
  process.exit(1);
});