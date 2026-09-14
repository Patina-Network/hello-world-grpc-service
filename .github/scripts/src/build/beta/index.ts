import {
  GitHubClient,
  ProtobufCompilerBackend,
  ProtobufCompilerClient,
  ProtobufSourceLanguage,
  ProtobufTargetLanguage,
  VersioningClient,
  VersionUpdatingStrategy,
} from "@tahminator/pipeline";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { sha } = await yargs(hideBin(process.argv))
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

async function main() {
  const {
    artifactKeeperToken,
    artifactKeeperUsername,
    bufToken,
    githubAppAppId,
    githubAppInstallationId,
    githubAppPemContent,
  } = parseCiEnv(process.env);

  const protoClient = new ProtobufCompilerClient();

  const cargoToml = Bun.TOML.parse(await Bun.file("./Cargo.toml").text()) as {
    package?: { version?: string };
  };

  const baseVersion = cargoToml.package?.version;
  if (!baseVersion) {
    throw new Error("Missing [package].version in Cargo.toml");
  }

  const ghClient = await GitHubClient.createWithGithubAppToken({
    appId: githubAppAppId,
    installationId: githubAppInstallationId,
    privateKey: githubAppPemContent,
  });
  const versioningClient = new VersioningClient(
    ghClient,
    VersionUpdatingStrategy.RUST_CARGO,
  );

  const shortSha = await getShortSha(sha);
  const betaVersion = await versioningClient.nextBeta(shortSha);

  await protoClient.compile({
    sourceLanguage: ProtobufSourceLanguage.RUST,
    backend: {
      type: ProtobufCompilerBackend.ARTIFACT_KEEPER,
      url: "https://pkg.vpn.patinanetwork.org",
      username: artifactKeeperUsername,
      token: artifactKeeperToken,
    },
    targetLanguages: {
      [ProtobufTargetLanguage.RUST]: {
        crateName: "hello-world-grpc-service",
        version: betaVersion,
      },
      [ProtobufTargetLanguage.GO]: {
        version: betaVersion,
      },
      [ProtobufTargetLanguage.JAVA]: {
        groupId: "org.patinanetwork.grpc",
        artifactId: "hello-world-grpc-service",
        version: betaVersion,
        buildTool: "gradle",
      },
    },
    protoFilesLocation: "./proto",
    bufToken,
  });
}

function parseCiEnv(ciEnv: Record<string, string | undefined>) {
  const artifactKeeperToken = (() => {
    const v = ciEnv["ARTIFACTKEEPER_TOKEN"];
    if (!v) {
      throw new Error("Missing ARTIFACTKEEPER_TOKEN from env");
    }
    return v;
  })();

  const artifactKeeperUsername = (() => {
    const v = ciEnv["ARTIFACTKEEPER_USERNAME"];
    if (!v) {
      throw new Error("Missing ARTIFACTKEEPER_USERNAME from env");
    }
    return v;
  })();

  const bufToken = (() => {
    const v = ciEnv["BUF_TOKEN"];
    if (!v) {
      throw new Error("Missing BUF_TOKEN from env");
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

  const githubAppPemContent = (() => {
    const v = ciEnv["_GITHUB_APP_PEM_CONTENT"];
    if (!v) {
      throw new Error("Missing _GITHUB_APP_PEM_CONTENT from env");
    }
    return v;
  })();

  return {
    artifactKeeperToken,
    artifactKeeperUsername,
    bufToken,
    githubAppAppId,
    githubAppInstallationId,
    githubAppPemContent,
  };
}

async function getShortSha(sha: string) {
  const shortSha = sha.slice(0, 8).toString().trim();

  if (shortSha.length !== 8) {
    throw new Error("Could not parse git SHA");
  }

  return shortSha;
}

void main();
