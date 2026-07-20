import "./env";
import { notifyAnomalies, scanAnomalies } from "./anomalies";

async function main() {
  const result = await scanAnomalies();
  console.log(`series evaluated: ${result.evaluated}`);
  if (result.flagged.length === 0) {
    console.log("no anomalies flagged for the most recent complete week");
  } else {
    for (const anomaly of result.flagged) {
      console.log(
        `ANOMALY ${anomaly.dimension}/${anomaly.dimensionKey} week ${anomaly.week}: observed ${anomaly.observed}, z=${anomaly.z}`,
      );
    }
    console.log(`new this scan: ${result.newCount}`);
  }
  await notifyAnomalies(result);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
