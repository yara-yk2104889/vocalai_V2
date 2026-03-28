import fs from "fs/promises";
import path from "path";

const FILE_PATH = path.join(process.cwd(), "responses.json");

export async function POST(req: Request) {
  try {
    const body = await req.json();

    let existing: unknown[] = [];
    try {
      const raw = await fs.readFile(FILE_PATH, "utf-8");
      existing = JSON.parse(raw);
    } catch {
      // file doesn't exist yet or is malformed — start fresh
    }

    existing.push({ ...body, savedAt: new Date().toISOString() });
    await fs.writeFile(FILE_PATH, JSON.stringify(existing, null, 2), "utf-8");

    return Response.json({ ok: true });
  } catch (err) {
    console.error("save-response error:", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
