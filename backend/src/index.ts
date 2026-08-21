import "dotenv/config";
import express, {
  type ErrorRequestHandler,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import { assertSupabaseConfigured } from "./supabase.js";
import categoriesRouter from "./routes/categories.js";
import productsRouter from "./routes/products.js";

const app = express();
const PORT = Number(process.env.PORT) || 4000;
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(
  cors({
    origin: corsOrigin.split(",").map((s) => s.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    ok: true,
    service: "hexacards-backend",
    language: "typescript",
    supabase: assertSupabaseConfigured(),
    time: new Date().toISOString(),
  });
});

app.use("/api/categories", categoriesRouter);
app.use("/api/products", productsRouter);

const errorHandler: ErrorRequestHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err);
  res.status(500).json({ ok: false, error: "Internal server error" });
};

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`HexaCards backend (TypeScript) on http://localhost:${PORT}`);
  console.log(`  GET  /health`);
  console.log(`  CRUD /api/categories`);
  console.log(`  CRUD /api/products`);
});
