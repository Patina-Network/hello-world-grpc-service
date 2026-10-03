import { DockerClient } from "@tahminator/pipeline";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { originalTag, newGithubTag, arch } = await yargs(hideBin(process.argv))
  .option("originalTag", {
    type: "string",
    demandOption: true,
  })
  .option("newGithubTag", {
    type: "string",
    demandOption: true,
  })
  .option("arch", {
    choices: ["amd64", "arm64"] as const,
    describe:
      "Image architecture to promote; must match the runner's architecture",
    default: "amd64" as const,
  })
  .strict()
  .parse();

const dockerRepository =
  arch === "arm64"
    ? "hello-world-grpc-service-arm"
    : "hello-world-grpc-service";

export async function main() {
  const { dockerHubPat, dockerHubUsername } = parseCiEnv(process.env);
  await using dockerClient = await DockerClient.create(
    dockerHubUsername,
    dockerHubPat,
  );

  await dockerClient.promoteDockerImage({
    originalTag,
    newGithubTags: [newGithubTag, "latest"],
    repository: dockerRepository,
  });
}

function parseCiEnv(ciEnv: Record<string, string | undefined>) {
  const dockerHubPat = (() => {
    const v = ciEnv["DOCKER_HUB_PAT"];
    if (!v) {
      throw new Error("Missing DOCKER_HUB_PAT from env");
    }
    return v;
  })();

  const dockerHubUsername = (() => {
    const v = ciEnv["DOCKER_HUB_USERNAME"];
    if (!v) {
      throw new Error("Missing DOCKER_HUB_USERNAME from env");
    }
    return v;
  })();

  return { dockerHubPat, dockerHubUsername };
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
