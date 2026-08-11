"use strict";
/* eslint-disable @typescript-eslint/no-require-imports -- This adapter exercises the same CommonJS FunctionGraph bundle locally. */

const http = require("http");
const nextEnv = require("@next/env");

nextEnv.loadEnvConfig(process.cwd());
process.env.ONLINE_ROOM_ALLOWED_ORIGINS ||= "http://localhost:3000";

const { closePool, handler } = require("./index");
const port = Number(process.env.ONLINE_ROOM_PORT || 8787);

const server = http.createServer((request, response) => {
  const chunks = [];
  let size = 0;
  request.on("data", (chunk) => {
    size += chunk.length;
    if (size > 8192) {
      response.writeHead(413).end();
      request.destroy();
      return;
    }
    chunks.push(chunk);
  });
  request.on("end", async () => {
    if (response.writableEnded) return;
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const result = await handler({
      body: Buffer.concat(chunks).toString("utf8"),
      headers: request.headers,
      httpMethod: request.method,
      isBase64Encoded: false,
      path: url.pathname,
      queryStringParameters: Object.fromEntries(url.searchParams),
      requestContext: { requestId: request.headers["x-request-id"] },
    });
    response.writeHead(result.statusCode, result.headers);
    response.end(result.body);
  });
});

server.listen(port, "127.0.0.1", () => {
  console.info(`BloomPal online room listening on http://localhost:${port}/online-room`);
});

async function shutdown() {
  server.close();
  await closePool();
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
