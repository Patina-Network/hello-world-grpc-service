import { DockerClient, GitHubClient } from "@tahminator/pipeline";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { sha, prId } = await yargs(hideBin(process.argv))
  .option("sha", {
    type: "string",
    demandOption: true,
  })
  .option("prId", {
    type: "number",
    demandOption: true,
  })
  .strict()
  .parse();

const tagPrefix = "staging-";

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

  const tags = [`${tagPrefix}${sha}`];

  console.log("Building image with following tags:");
  tags.forEach((tag) => console.log(tag));

  await dockerClient.buildImage({
    dockerRepository: "hello-world-grpc-service",
    dockerFileLocation: "Dockerfile",
    tags,
    shouldUpload: true,
    platforms: ["linux/amd64"],
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
    repository: "codebloom",
    message: `The image has been uploaded to https://hub.docker.com/r/patinanetwork/hello-world-grpc-service/tags under the following tags:

${tags.map((t) => `- \`hello-world-grpc-service:${t}\``).join("\n")}
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
