import "./env";
import { backfillEmbeddings, EMBEDDING_MODEL } from "./embeddings";

async function main() {
  const result = await backfillEmbeddings();
  if (result.skipped) {
    console.log(`SKIP: ${result.reason}`);
    process.exit(0);
  }
  console.log(`model: ${EMBEDDING_MODEL}`);
  console.log(`already embedded with current model: ${result.alreadyCurrent}`);
  console.log(`newly embedded: ${result.embedded}`);
  console.log(`total tokens: ${result.totalTokens}`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
