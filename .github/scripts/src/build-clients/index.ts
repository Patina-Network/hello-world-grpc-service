import {
  ProtobufCompilerBackend,
  ProtobufCompilerClient,
  ProtobufSourceLanguage,
  ProtobufTargetLanguage,
} from "@tahminator/pipeline";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const { version } = await yargs(hideBin(process.argv))
  .option("version", {
    type: "string",
    demandOption: true,
  })
  .strict()
  .parse();

async function main() {
  const { artifactKeeperToken, artifactKeeperUsername, bufToken } = parseCiEnv(
    process.env,
  );

  const protoClient = new ProtobufCompilerClient();

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
        version,
      },
      [ProtobufTargetLanguage.GO]: {
        version,
      },
      [ProtobufTargetLanguage.JAVA]: {
        groupId: "org.patinanetwork.grpc",
        artifactId: "hello-world-grpc-service",
        version,
        buildTool: "maven",
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

  return { artifactKeeperToken, artifactKeeperUsername, bufToken };
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
