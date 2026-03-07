import type { VercelRequest, VercelResponse } from "@vercel/node";
import app, { ready } from "./index";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ready;
  app(req, res);
}
