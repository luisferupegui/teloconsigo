import "server-only";
import fs from "fs";
import path from "path";

export type SearchMode = "co_eeuu" | "eeuu_co" | "co_only" | "eeuu_only";

const PRIORITY_PATH = path.join(process.cwd(), "data", "search-priority.json");

export function loadSearchPriority(): Record<string, SearchMode> {
  try {
    return JSON.parse(fs.readFileSync(PRIORITY_PATH, "utf-8")) as Record<string, SearchMode>;
  } catch {
    return {};
  }
}

export function saveSearchPriority(data: Record<string, SearchMode>): void {
  fs.writeFileSync(PRIORITY_PATH, JSON.stringify(data, null, 2), "utf-8");
}

export function getSearchMode(catKey: string): SearchMode {
  const config = loadSearchPriority();
  return config[catKey] ?? config["default"] ?? "co_eeuu";
}
