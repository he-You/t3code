import { TextGenerationError } from "@t3tools/contracts";
import { DeepseekSettings } from "../settings.ts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import type * as Path from "effect/Path";
import * as SecureRandom from "effect/crypto/SecureRandom";

import * as ProviderHost from "@t3tools/provider-core/server/ProviderHost";
import {
  defaultProviderContinuationIdentity,
  type ProviderDriver,
  type ProviderInstance,
} from "@t3tools/provider-core/server/driver";
import { ProviderDriverError } from "@t3tools/provider-core/server/errors";
import { mergeProviderInstanceEnvironment } from "@t3tools/provider-core/server/instanceEnvironment";
import { withInstanceIdentity } from "@t3tools/provider-core/server/instanceIdentity";
import { makeManualOnlyProviderMaintenanceCapabilities } from "@t3tools/provider-core/server/maintenanceResolver";
import { makeManagedServerProvider } from "@t3tools/provider-core/server/managedProvider";
import {
  haveProviderSnapshotSettingsChanged,
  makeProviderSnapshotSettingsSource,
  type ProviderSnapshotSettings,
} from "@t3tools/provider-core/server/snapshotSettings";
import type { ProviderTextGeneration } from "@t3tools/provider-core/server/textGeneration";
import { DEEPSEEK_PROVIDER, withDeepseekApiKey } from "./acpSupport.ts";
import { DeepseekAdapterV2Driver, type DeepseekAdapterV2DriverEnv } from "./adapter.ts";
import { buildInitialDeepseekProviderSnapshot, checkDeepseekProviderStatus } from "./status.ts";
import { deepseekUsageReader } from "./usage.ts";

const decodeDeepseekSettings = Schema.decodeSync(DeepseekSettings);
// DeepSeek Harness updates with its desktop app, so T3 offers no one-click update.
const MAINTENANCE = makeManualOnlyProviderMaintenanceCapabilities({
  provider: DEEPSEEK_PROVIDER,
  packageName: null,
});

const unsupportedTextGeneration: ProviderTextGeneration = (() => {
  const unsupported = (operation: string) =>
    Effect.fail(
      new TextGenerationError({
        operation,
        detail: "DeepSeek Harness does not provide application text generation.",
      }),
    );
  return {
    generateCommitMessage: () => unsupported("generateCommitMessage"),
    generatePrContent: () => unsupported("generatePrContent"),
    generateBranchName: () => unsupported("generateBranchName"),
    generateThreadTitle: () => unsupported("generateThreadTitle"),
    generateReviewGuide: () => unsupported("generateReviewGuide"),
    generateTranscriptionPostProcessing: () => unsupported("generateTranscriptionPostProcessing"),
  };
})();

export type DeepseekDriverEnv =
  | DeepseekAdapterV2DriverEnv
  | ChildProcessSpawner.ChildProcessSpawner
  | SecureRandom.SecureRandom
  | ProviderHost.ProviderHost;

export const DeepseekDriver: ProviderDriver<DeepseekSettings, DeepseekDriverEnv, Path.Path> = {
  driverKind: DEEPSEEK_PROVIDER,
  metadata: {
    displayName: "DeepSeek",
    supportsMultipleInstances: true,
  },
  configSchema: DeepseekSettings,
  defaultConfig: (): DeepseekSettings => decodeDeepseekSettings({}),
  usage: deepseekUsageReader,
  create: Effect.fn("DeepseekDriver.create")(function* ({
    instanceId,
    displayName,
    accentColor,
    environment,
    enabled,
    config,
  }) {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
    const random = yield* SecureRandom.SecureRandom;
    const host = yield* ProviderHost.ProviderHost;
    const processEnv = withDeepseekApiKey(
      config,
      yield* mergeProviderInstanceEnvironment(environment, yield* HostProcess.Environment),
    );
    const continuationIdentity = defaultProviderContinuationIdentity({
      driverKind: DEEPSEEK_PROVIDER,
      instanceId,
    });
    const stampIdentity = withInstanceIdentity({
      instanceId,
      driverKind: DEEPSEEK_PROVIDER,
      displayName,
      accentColor,
      continuationGroupKey: continuationIdentity.continuationKey,
    });
    const effectiveConfig = { ...config, enabled } satisfies DeepseekSettings;

    const snapshotSettings = yield* makeProviderSnapshotSettingsSource(effectiveConfig);
    const snapshot = yield* makeManagedServerProvider<ProviderSnapshotSettings<DeepseekSettings>>({
      resolveMaintenance: () => Effect.succeed(MAINTENANCE),
      getSettings: snapshotSettings.getSettings,
      streamSettings: snapshotSettings.streamSettings,
      haveSettingsChanged: haveProviderSnapshotSettingsChanged,
      initialSnapshot: (settings) =>
        buildInitialDeepseekProviderSnapshot(settings.provider).pipe(Effect.map(stampIdentity)),
      checkProvider: checkDeepseekProviderStatus({
        settings: effectiveConfig,
        environment: processEnv,
        cwd: host.paths.cwd,
      }).pipe(
        Effect.map(stampIdentity),
        Effect.provideService(ChildProcessSpawner.ChildProcessSpawner, spawner),
        Effect.provideService(SecureRandom.SecureRandom, random),
      ),
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DEEPSEEK_PROVIDER,
            instanceId,
            detail: "Failed to build DeepSeek snapshot.",
            cause,
          }),
      ),
    );

    const orchestrationAdapter = yield* DeepseekAdapterV2Driver.create({
      instanceId,
      displayName,
      accentColor,
      environment,
      enabled,
      config,
    }).pipe(
      Effect.mapError(
        (cause) =>
          new ProviderDriverError({
            driver: DEEPSEEK_PROVIDER,
            instanceId,
            detail: "Failed to build DeepSeek orchestration adapter.",
            cause,
          }),
      ),
    );

    return {
      instanceId,
      driverKind: DEEPSEEK_PROVIDER,
      continuationIdentity,
      displayName,
      accentColor,
      enabled,
      snapshot,
      orchestrationAdapter,
      textGeneration: unsupportedTextGeneration,
    } satisfies ProviderInstance;
  }),
};
