import { describePackageManifestContract } from "../../../test/helpers/plugins/package-manifest-contract.js";

type PackageManifestContractParams = Parameters<typeof describePackageManifestContract>[0];

const packageManifestContractTests: PackageManifestContractParams[] = [
  {
    pluginId: "memory-lancedb",
    mirroredRootRuntimeDeps: ["@lancedb/lancedb", "@sinclair/typebox", "openai"],
    minHostVersionBaseline: "2026.4.10",
  },
  { pluginId: "openshell", pluginLocalRuntimeDeps: ["openshell"] },
  {
    pluginId: "voice-call",
    mirroredRootRuntimeDeps: ["@sinclair/typebox", "commander", "ws"],
    minHostVersionBaseline: "2026.4.10",
  },
  { pluginId: "webhooks", mirroredRootRuntimeDeps: ["zod"] },
  { pluginId: "memory-wiki", mirroredRootRuntimeDeps: ["yaml"] },
  { pluginId: "llm-task", mirroredRootRuntimeDeps: ["@sinclair/typebox", "ajv"] },
];

for (const params of packageManifestContractTests) {
  describePackageManifestContract(params);
}
