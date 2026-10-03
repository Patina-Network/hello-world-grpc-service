import { DockerClient, GitHubClient } from "@tahminator/pipeline";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { getShortSha } from "../../utils";

const { sha, prId, arch } = await yargs(hideBin(process.argv))
  .option("sha", {
    type: "string",
    demandOption: true,
  })
  .option("prId", {
    type: "number",
    demandOption: true,
  })
  .option("arch", {
    choices: ["amd64", "arm64"] as const,
    describe: "Docker build architecture",
    default: "amd64" as const,
  })
  .strict()
  .parse();

const tagPrefix = "staging-";
const dockerRepository =
  arch === "arm64"
    ? "hello-world-grpc-service-arm"
    : "hello-world-grpc-service";
const platforms = [`linux/${arch}`];

async function main() {
  const {
    dockerHubPat,
    dockerHubUsername,
    githubAppAppId,
    githubAppInstallationId,
    githubAppPrivateKey,
  } = parseCiEnv(process.env);

  await using dockerClient = await DockerClient.create(
    dockerHubUsername,
    dockerHubPat,
  );

  const shortSha = await getShortSha(sha);
  const tags = [`${tagPrefix}${shortSha}`];

  console.log("Building image with following tags:");
  tags.forEach((tag) => console.log(tag));

  await dockerClient.buildImage({
    dockerRepository,
    dockerFileLocation: "Dockerfile",
    tags,
    shouldUpload: true,
    platforms,
  });

  console.log("Image pushed successfully.");

  const githubClient = await GitHubClient.createWithGithubAppToken({
    appId: githubAppAppId,
    installationId: githubAppInstallationId,
    privateKey: githubAppPrivateKey,
  });

  await githubClient.sendPrMessage({
    prId,
    owner: "Patina-Network",
    repository: "hello-world-grpc-service",
    message: `The gRPC server image has been uploaded to https://hub.docker.com/r/patinanetwork/${dockerRepository}/tags under the following tags:

${tags.map((t) => `- \`${dockerRepository}:${t}\``).join("\n")}
`,
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

  const githubAppAppId = (() => {
    const v = ciEnv["_GITHUB_APP_APP_ID"];
    if (!v) {
      throw new Error("Missing _GITHUB_APP_APP_ID from env");
    }
    return v;
  })();

  const githubAppInstallationId = (() => {
    const v = ciEnv["_GITHUB_APP_INSTALLATION_ID"];
    if (!v) {
      throw new Error("Missing _GITHUB_APP_INSTALLATION_ID from env");
    }
    return v;
  })();

  const githubAppPrivateKey = (() => {
    const v = ciEnv["_GITHUB_APP_PEM_CONTENT"];
    if (!v) {
      throw new Error("Missing _GITHUB_APP_PEM_CONTENT from env");
    }
    return v;
  })();

  return {
    dockerHubPat,
    dockerHubUsername,
    githubAppAppId,
    githubAppInstallationId,
    githubAppPrivateKey,
  };
}

void main();
