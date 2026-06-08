import config from "../../config";
import { callService } from "../utils/internalCallService";

async function run() {
  if (!process.env.INTERNAL_KEY) {
    throw new Error("INTERNAL_KEY is not configured");
  }

  const response = await callService(config.backends.causes.url, "/status/internal", {
    method: "GET",
  });

  console.log("Internal call shared -> backend OK:", response);
}

run().catch((error) => {
  console.error("Internal call shared -> backend failed:", error.message);
  process.exit(1);
});
