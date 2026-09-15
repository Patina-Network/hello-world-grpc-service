import { DockerClient, GitHubClient } from "@tahminator/pipeline";
import { $ } from "bun";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { getGhaOutput, githubOutputFile } = await yargs(hideBin(process.argv))
  .option("getGhaOutput", {
    type: "boolean",
    describe:
      "Enable GitHub Actions output to receive latest built tag version",
    default: false,
  })
  .option("githubOutputFile", {
    type: "string",
    describe: "Path to GITHUB_OUTPUT (passed in automatically in CI)",
    default: process.env.GITHUB_OUTPUT,
  })
  .strict()
  .parse();

async function main() {
  const {
    dockerHubPat,
    dockerHubUsername,
    githubAppAppId,
    githubAppInstallationId,
    githubAppPrivateKey,
  } = parseCiEnv(process.env);

  const gitSha = (await $`git rev-parse --short HEAD`.text()).trim();

  await using dockerClient = await DockerClient.create(
    dockerHubUsername,
    dockerHubPat,
  );

  const tags = [`latest`, `${gitSha}`];

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

  if (getGhaOutput && githubOutputFile) {
    const githubClient = await GitHubClient.createWithGithubAppToken({
      appId: githubAppAppId,
      installationId: githubAppInstallationId,
      privateKey: githubAppPrivateKey,
    });
    await githubClient.outputToGithubOutput({
      overrideGithubOutputFile: githubOutputFile,
      ctx: {
        tag: gitSha,
      },
    });
  }
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
