
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { app } from "./app";

// Load local configuration only when .env exists.
if (existsSync(".env")) {
  loadEnvFile(".env");
}

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("Invalid server PORT");
}

app.listen(port, () => {
  console.log(`WorkFlow Pro API running on port ${port}`);
});
