import { createServer } from "node:http";
import { readFile } from "node:fs/promises";

const pages = new Map([
  ["/", ["index.html", "text/html"]],
  ["/index.html", ["index.html", "text/html"]],
  ["/app.js", ["app.js", "text/javascript"]],
  ["/ledger.js", ["ledger.js", "text/javascript"]],
  ["/style.css", ["style.css", "text/css"]],
]);

const server = createServer(async (request, response) => {
  const page = pages.get(request.url.split("?")[0]);
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  if (!page) {
    response.writeHead(404).end();
    return;
  }
  try {
    const content = await readFile(new URL("./docs/" + page[0], import.meta.url));
    response.writeHead(200, { "Content-Type": page[1] + "; charset=utf-8", "Cache-Control": "no-cache" });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(500).end("No se pudo abrir el archivo.");
  }
});

const port = Number(process.env.PORT || 4173);
server.on("error", error => {
  console.error(error.code === "EADDRINUSE" ? "El puerto ya está en uso. Revisá si la app ya está abierta." : error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => {
  console.log("Abrí http://127.0.0.1:" + server.address().port + " en tu navegador.");
});
