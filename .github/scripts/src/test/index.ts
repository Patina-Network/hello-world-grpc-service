import { SonarScannerClient } from "@tahminator/pipeline";
import { $ } from "bun";

import { exclusions } from "../../../../exclusions";

async function main() {
  const { sonarToken } = parseCiEnv(process.env);

  const sonarClient = new SonarScannerClient({
    auth: {
      token: sonarToken,
    },
    scan: {
      additionalArgs: {
        "rust.lcov.reportPaths": "./lcov.info",
        exclusions: `${exclusions}`,
      },
      organization: "patina-network",
      sourceCodeDir: "./",
      projectKey: "Patina-Network_hello-world-grpc-service",
    },
    run: {
      runTestsCmd: $`cargo clippy --message-format=json > clippy-report.json && cargo tarpaulin --out lcov`,
    },
  });

  await sonarClient.runTests();
  await sonarClient.uploadTestCoverage();
}

function parseCiEnv(ciEnv: Record<string, string | undefined>) {
  const sonarToken = (() => {
    const v = ciEnv["SONAR_TOKEN"];
    if (!v) {
      throw new Error("Missing SONAR_TOKEN from env");
    }
    return v;
  })();

  return { sonarToken };
}

void main();
