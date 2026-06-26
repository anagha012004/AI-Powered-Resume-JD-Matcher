import type { NextApiRequest, NextApiResponse } from "next";
import http from "http";
import https from "https";
import { URL } from "url";

const BACKEND = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
    externalResolver: true,
  },
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const path = (req.query.path as string[]).join("/");
  const target = new URL(`${BACKEND}/api/v1/${path}`);

  const isHttps = target.protocol === "https:";
  const transport = isHttps ? https : http;

  const options: http.RequestOptions = {
    hostname: target.hostname,
    port: target.port || (isHttps ? 443 : 80),
    path: target.pathname + (target.search || ""),
    method: req.method,
    headers: {
      ...req.headers,
      host: target.hostname,
    },
    timeout: 120_000, // 2 minutes — model cold-start + Gemini call
  };

  const proxy = transport.request(options, (upstream) => {
    res.writeHead(upstream.statusCode ?? 502, upstream.headers);
    upstream.pipe(res, { end: true });
  });

  proxy.on("timeout", () => {
    proxy.destroy();
    res.status(504).json({ detail: "Gateway timeout — backend took too long." });
  });

  proxy.on("error", (err) => {
    console.error("[proxy error]", err.message);
    if (!res.headersSent) {
      res.status(502).json({ detail: "Could not reach backend." });
    }
  });

  // Pipe the raw incoming request (including multipart body) straight through
  req.pipe(proxy, { end: true });
}
