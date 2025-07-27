/**
 * Protocol: Universal Protocol Standard v1.0
 * Routing Style: Path param only (no mixed mode)
 * Last Reviewed: 2025-07-26
 * Purpose: Express server with zero hardcoding policy
 */

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { setupVite, serveStatic, log } from "./vite";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { UniversalAIConfig } from "./universal-ai-config";

const app = express();

// Only apply JSON parsing to non-multipart requests
app.use((req, res, next) => {
  const contentType = req.headers['content-type'] || '';
  // Skip JSON parsing for multipart form data AND file upload routes
  if (contentType.includes('multipart/form-data') || req.path.includes('/import')) {
    return next();
  }
  return express.json({ limit: "10mb" })(req, res, next);
});

app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = UniversalAIConfig.getPerformanceTime();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = UniversalAIConfig.getPerformanceTime() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // CRITICAL FIX: Force built frontend mode to bypass Vite middleware API interception
  // WORKAROUND DOCUMENTATION: Vite dev server intercepts ALL API calls returning HTML instead of JSON
  // SOLUTION: Serve built React frontend so API calls reach backend directly
  // REVERT CONDITION: When Vite proxy configuration becomes available in vite.config.ts
  
  const forceBuiltMode = true; // Override to fix API interception issue
  let server;
  
  if (app.get("env") === "development" && !forceBuiltMode) {
    log("⚠️  Using Vite dev server - API calls may be intercepted");
    
    server = await registerRoutes(app);
    await setupVite(app, server);
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });
    
  } else {
    log("🚀 SERVING BUILT FRONTEND - Bypassing Vite middleware API interception");
    
    // CRITICAL: Register API routes FIRST, before ANY middleware or static serving
    console.log("[SERVER] Registering API routes directly to Express app");
    
    // IMMEDIATE DEBUG: Add test route directly to app
    app.get("/api/test-direct", (req, res) => {
      console.log("[SERVER] Direct test route hit");
      res.json({ success: true, message: "Direct route working" });
    });
    
    try {
      console.log("[SERVER] About to call registerRoutes");
      await registerRoutes(app);
      console.log("[SERVER] registerRoutes completed successfully");
    } catch (error) {
      console.error("[SERVER] CRITICAL ERROR in registerRoutes:", error);
      throw error;
    }
    
    // AFTER API routes: Serve static assets from built React app - but NOT for API routes
    const publicPath = path.resolve(__dirname, '../dist/public');
    app.use((req, res, next) => {
      // Skip static file serving for API routes
      if (req.path.startsWith('/api/')) {
        return next();
      }
      return express.static(publicPath)(req, res, next);
    });
    
    // LAST: Handle React Router - serve index.html for non-API routes only (MUST be last)
    app.get('*', (req, res, next) => {
      // API routes should never reach here
      if (req.path.startsWith('/api/')) {
        console.log(`[Server] CRITICAL: API route ${req.path} reached catch-all - check route registration`);
        return res.status(404).json({ error: 'API endpoint not found', path: req.path });
      }
      
      // Serve React app for all other routes
      const indexPath = path.resolve(publicPath, 'index.html');
      res.sendFile(indexPath);
    });
    
    server = createServer(app);
    
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ message });
      throw err;
    });
    
    log("✅ Built frontend active - API calls now reach backend directly");
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
