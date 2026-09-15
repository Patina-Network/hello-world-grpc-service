import {
  EnvClient,
  EnvClientStrategy,
  GitHubClient,
  VersioningClient,
  VersionUpdatingStrategy,
} from "@tahminator/pipeline";

export async function main() {
  const envClient = EnvClient.create(EnvClientStrategy.SOPS);
  const { githubAppAppId, githubAppInstallationId, githubAppPrivateKey } =
    parseCiEnv(await envClient.readFromEnv("secrets.yaml"));

  const ghClient = await GitHubClient.createWithGithubAppToken({
    appId: githubAppAppId,
    installationId: githubAppInstallationId,
    privateKey: githubAppPrivateKey,
  });

  const cargoToml = Bun.TOML.parse(await Bun.file("./Cargo.toml").text()) as {
    package?: { version?: string };
  };

  const baseVersion = cargoToml.package?.version;
  if (!baseVersion) {
    throw new Error("Missing [package].version in Cargo.toml");
  }

  const versioningClient = new VersioningClient(
    ghClient,
    VersionUpdatingStrategy.RUST_CARGO,
  );

  await ghClient.createTag({
    nextTag: await versioningClient.next(baseVersion),
    onPreTagCreate: async (tag) => {
      await versioningClient.update(tag);
    },
  });
}

function parseCiEnv(ciEnv: Record<string, string>) {
  const githubAppAppId = (() => {
    const v = ciEnv["_GITHUB_APP_APP_ID"];
    if (!v) {
      throw new Error("Missing _GITHUB_APP_APP_ID from .env.ci");
    }
    return v;
  })();

  const githubAppInstallationId = (() => {
    const v = ciEnv["_GITHUB_APP_INSTALLATION_ID"];
    if (!v) {
      throw new Error("Missing _GITHUB_APP_INSTALLATION_ID from .env.ci");
    }
    return v;
  })();

  const githubAppPrivateKey = (() => {
    const v = ciEnv["_GITHUB_APP_PEM_CONTENT"];
    if (!v) {
      throw new Error("Missing _GITHUB_APP_PRIVATE_KEY from .env.ci");
    }
    return v;
  })();

  return { githubAppAppId, githubAppInstallationId, githubAppPrivateKey };
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
