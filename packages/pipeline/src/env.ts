import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const dir = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.resolve(dir, "../../../.env") });
