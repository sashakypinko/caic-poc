import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function getDistPath(dirname: string): string {
  return path.resolve(dirname, "public");
}

export function validateDistPath(distPath: string): void {
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }
}

export function serveStatic(app: Express, dirname: string = __dirname) {
  const distPath = getDistPath(dirname);
  validateDistPath(distPath);

  app.use(express.static(distPath));

  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
