import puppeteer from "puppeteer";

const server = Bun.serve({
  async fetch (req) {
    // Handle paths with the base URL prefix
    let path = new URL(req.url).pathname;
    // Remove the base path prefix if present
    path = path.replace(/^\/tools\/converter/, "") || "index.html";
    path = path.replace(/^\//, "") || "index.html";
    const file = Bun.file(`${import.meta.dir}/dist/${path}`);
    if (!(await file.exists())) return new Response("Not Found", { status: 404 });
    return new Response(file);
  },
  port: 8080
});

const browser = await puppeteer.launch({
  headless: "new",
  args: ["--no-sandbox", "--disable-setuid-sandbox"]
});

const page = await browser.newPage();

await Promise.all([
  new Promise(resolve => {
    page.on("console", msg => {
      const text = msg.text();
      if (text === "Built initial format list.") resolve();
    });
  }),
  // Use the correct base path for the built app
  page.goto("http://localhost:8080/tools/converter/index.html")
]);

const cacheJSON = await page.evaluate(() => {
  return window.printSupportedFormatCache();
});
const outputPath = process.argv[2] || "cache.json";
await Bun.write(outputPath, cacheJSON);

await browser.close();
server.stop();
