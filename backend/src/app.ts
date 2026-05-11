import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import path from "path";
import fs from "fs";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Debug endpoint — PM2 logs (no auth, for quick server diagnostics)
app.get("/api/debug/pm2", (_req, res) => {
  const { execSync } = require("child_process");
  const fs = require("fs");
  try {
    const out = execSync("pm2 logs redon3-api --lines 30 --nostream 2>&1", { timeout: 5000 }).toString();
    let errors: string[] = [];
    if (fs.existsSync("/tmp/redon3-errors.log")) {
      const content = fs.readFileSync("/tmp/redon3-errors.log", "utf8");
      errors = content.split("\n").filter(Boolean).slice(-20);
    }
    res.json({ logs: out.split("\n").slice(0, 30), errors });
  } catch {
    res.status(500).json({ error: "Could not read logs" });
  }
});

app.use("/api", router);

// Serve frontend static files
const frontendDist = path.resolve(import.meta.dirname, "../../redon3/dist/public");
if (fs.existsSync(frontendDist)) {
  // Assets with hash in filename — cache for a year
  app.use("/assets", express.static(path.join(frontendDist, "assets"), {
    maxAge: "1y",
    immutable: true,
  }));

  // index.html — never cache
  app.get("/", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(frontendDist, "index.html"));
  });

  // SPA fallback — serve index.html for any non-API route, never cache
  app.get("/{*path}", (_req: Request, res: Response) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.sendFile(path.join(frontendDist, "index.html"));
  });

  // Other static files (favicon etc)
  app.use(express.static(frontendDist, { maxAge: "1h" }));
}

export default app;
