// Keep the supplied portal intact; only bundle its runtimes and wire the two entries.
import fs from "node:fs";
import postcss from "postcss";
import tailwindcss from "tailwindcss";
const root = new URL("../", import.meta.url);
const source = fs.readFileSync(
  new URL("reference/homepage.original.html", root),
  "utf8",
);
const css = await postcss([
  tailwindcss({
    content: [{ raw: source, extension: "html" }],
    theme: { extend: {} },
    plugins: [],
  }),
]).process("@tailwind base;\n@tailwind components;\n@tailwind utilities;", {
  from: undefined,
});
fs.mkdirSync(new URL("public/assets/vendor/", root), { recursive: true });
fs.writeFileSync(new URL("public/assets/portal.css", root), css.css);
fs.copyFileSync(
  new URL("node_modules/vue/dist/vue.global.prod.js", root),
  new URL("public/assets/vendor/vue.global.prod.js", root),
);
fs.copyFileSync(
  new URL("public/assets/institute-logo.png", root),
  new URL("public/图片1.png", root),
);
let index = 0;
const html = source
  .replace(
    '<script src="https://cdn.tailwindcss.com"></script>',
    '<link rel="stylesheet" href="assets/portal.css">',
  )
  .replace(
    "https://unpkg.com/vue@3/dist/vue.global.js",
    "assets/vendor/vue.global.prod.js",
  )
  .replace(
    /<button class="entry-card/g,
    () =>
      `<button onclick="parent.postMessage({type:'cp-portal-entry',portal:'${index++ === 0 ? "government" : "enterprise"}'},location.origin)" class="entry-card`,
  );
fs.writeFileSync(new URL("public/homepage.html", root), html);
console.log("Original portal restored; layout, text and styles preserved.");
