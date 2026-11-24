import dotenv from "dotenv";
import express from "express";
import type { Request, Response, NextFunction } from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { generateSlideImageServer, generateStoryboardServer } from "./server/gemini.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load local env files without overriding host-injected environment variables
dotenv.config({ path: path.join(__dirname, ".env.local"), override: false });
dotenv.config({ path: path.join(__dirname, ".env"), override: false });

const MAX_PROMPT_LENGTH = 1000;

function formatApiError(error: unknown): { status: number; message: string } {
  const errObj =
    typeof error === "object" && error !== null
      ? (error as { status?: unknown; code?: unknown; message?: unknown })
      : null;

  const rawStatus =
    typeof errObj?.status === "number"
      ? errObj.status
      : typeof errObj?.code === "number"
        ? errObj.code
        : 500;

  const status = rawStatus >= 400 && rawStatus < 600 ? rawStatus : 500;

  if (status === 400) {
    return {
      status,
      message: "The Gemini API request was rejected. Please check your API key in Settings > Secrets.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      status,
      message: "Permission denied by the Gemini API. Please check your API key in Settings > Secrets.",
    };
  }
  if (status === 429) {
    return {
      status,
      message: "Gemini API quota exceeded. Please try again shortly or check your billing key in Settings > Secrets.",
    };
  }
  if (status === 404) {
    return {
      status,
      message: "The requested Gemini model was not found.",
    };
  }

  const rawMessage = typeof errObj?.message === "string" ? errObj.message : "";
  if (rawMessage.includes("GEMINI_API_KEY is not configured")) {
    return {
      status: 500,
      message: rawMessage,
    };
  }

  return {
    status,
    message: "Failed to generate content from Gemini. Please try again.",
  };
}

async function createServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "100kb" }));

  app.post("/api/gemini/storyboard", async (_req: Request, res: Response) => {
    try {
      const storyboard = await generateStoryboardServer();
      res.json(storyboard);
    } catch (error) {
      console.error("Storyboard generation error:", error);
      const { status, message } = formatApiError(error);
      res.status(status).json({ error: message });
    }
  });

  app.post("/api/gemini/slide-image", async (req: Request, res: Response) => {
    const body = req.body as { prompt?: unknown } | null;
    if (!body || typeof body !== "object" || typeof body.prompt !== "string") {
      res.status(400).json({ error: "A valid 'prompt' string is required." });
      return;
    }

    const prompt = body.prompt.trim();
    if (prompt.length === 0 || prompt.length > MAX_PROMPT_LENGTH) {
      res.status(400).json({
        error: `'prompt' must be between 1 and ${MAX_PROMPT_LENGTH} characters.`,
      });
      return;
    }

    try {
      const imageUrl = await generateSlideImageServer(prompt);
      res.json({ imageUrl });
    } catch (error) {
      console.error("Slide image generation error:", error);
      const { status, message } = formatApiError(error);
      res.status(status).json({ error: message });
    }
  });

  // Catch-all 404 for unknown API routes
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API route not found." });
  });

  const isProd = process.env.NODE_ENV === "production";
  const distDir = path.resolve(__dirname, "dist");

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: {
          middlewareMode: true,
          hmr: false,
          ws: false,
        },
        appType: "spa",
      });

      // HMR is disabled in this environment; serve a lightweight client shim
      // without opening WebSocket connections to avoid failing WS transport errors.
      app.get("/@vite/client", (_req: Request, res: Response) => {
        res.type("application/javascript").send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    document.head.appendChild(style);
    sheetsMap.set(id, style);
  }
  style.textContent = content;
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url) {
  return url;
}
export class ErrorOverlay extends HTMLElement {}
`);
      });

      app.use(vite.middlewares);
    } catch (viteError) {
      if (fs.existsSync(distDir)) {
        mountStaticDist(app, distDir);
      } else {
        throw viteError;
      }
    }
  } else {
    mountStaticDist(app, distDir);
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

function mountStaticDist(app: express.Express, distDir: string) {
  app.use(express.static(distDir));
  app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    res.sendFile(path.join(distDir, "index.html"));
  });
}

createServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
