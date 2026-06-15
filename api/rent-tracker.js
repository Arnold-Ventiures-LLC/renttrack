import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const DIR = "/tmp/renttrack-data";
const file = (name) => join(DIR, `${name}.json`);
const load = (name) => {
  mkdirSync(DIR, { recursive: true });
  return existsSync(file(name)) ? JSON.parse(readFileSync(file(name), "utf-8")) : [];
};
const save = (name, data) => {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(file(name), JSON.stringify(data, null, 2));
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default function handler(req, res) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  const url = new URL(req.url, `http://${req.headers.host}`);
  const entity = url.searchParams.get("entity");
  const id = url.searchParams.get("id");

  if (req.method === "GET") {
    if (entity === "all") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({
        properties: load("properties"),
        renters: load("renters"),
        payments: load("payments"),
        allocations: load("allocations"),
      }));
    } else if (entity) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(load(entity)));
    } else {
      res.writeHead(400); res.end("Missing entity");
    }
    return;
  }

  let body = "";
  req.on("data", chunk => { body += chunk; });
  req.on("end", () => {
    const data = body ? JSON.parse(body) : {};
    if (req.method === "POST") {
      const items = load(entity);
      const item = { id: randomUUID(), ...data, createdAt: new Date().toISOString() };
      items.push(item);
      save(entity, items);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(item));
    } else if (req.method === "PUT") {
      const items = load(entity);
      const idx = items.findIndex(i => i.id === id);
      if (idx === -1) { res.writeHead(404); res.end("Not found"); return; }
      items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
      save(entity, items);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(items[idx]));
    } else if (req.method === "DELETE") {
      const items = load(entity).filter(i => i.id !== id);
      save(entity, items);
      res.writeHead(204); res.end();
    } else {
      res.writeHead(405); res.end("Method not allowed");
    }
  });
}
