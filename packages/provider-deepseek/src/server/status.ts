import {
  type ModelCapabilities,
  settingsSecretLiteral,
  type ServerProviderAuth,
  type ServerProviderModel,
} from "@t3tools/contracts";
import type { DeepseekSettings } from "../settings.ts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as ChildProcess from "effect/process/ChildProcess";
import type * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import type * as SecureRandom from "effect/crypto/SecureRandom";
import { createModelCapabilities } from "@t3tools/shared/model";
import { resolveSpawnCommand } from "@t3tools/shared/shell";

import {
  buildServerProvider,
  parseGenericCliVersion,
  type ProviderProbeResult,
  providerModelsFromSettings,
  spawnAndCollect,
  type ServerProviderDraft,
} from "@t3tools/provider-core/server/snapshotProbe";
import { DEEPSEEK_API_KEY_ENV, DEEPSEEK_PROVIDER } from "./acpSupport.ts";
import { probeDeepseekSession, type DeepseekProbeResult } from "./probe.ts";

const DEEPSEEK_PRESENTATION = {
  displayName: "DeepSeek",
  showInteractionModeToggle: false,
} as const;
const EMPTY_CAPABILITIES: ModelCapabilities = createModelCapabilities({
  optionDescriptors: [],
});
/** T3's slug for "whatever model the harness starts with". */
export const DEEPSEEK_DEFAULT_MODEL_SLUG = "default";
const DEEPSEEK_BUILT_IN_MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: DEEPSEEK_DEFAULT_MODEL_SLUG,
    name: "DeepSeek default",
    isCustom: false,
    isDefault: true,
    capabilities: EMPTY_CAPABILITIES,
  },
];
const VERSION_PROBE_TIMEOUT = "15 seconds";

function deepseekAuth(
  settings: DeepseekSettings,
  environment: NodeJS.ProcessEnv,
): ServerProviderAuth {
  const configuredKey = settingsSecretLiteral(settings.apiKey).trim();
  return configuredKey.length > 0 || environment[DEEPSEEK_API_KEY_ENV]?.trim()
    ? { status: "authenticated", type: "api_key", label: "DeepSeek API key" }
    : { status: "unknown" };
}

function deepseekModels(
  settings: DeepseekSettings,
  probe: DeepseekProbeResult | undefined,
): ReadonlyArray<ServerProviderModel> {
  const discovered = probe?.models ?? [];
  const capabilities =
    probe === undefined || probe.optionDescriptors.length === 0
      ? EMPTY_CAPABILITIES
      : createModelCapabilities({ optionDescriptors: probe.optionDescriptors });
  const builtIn: ReadonlyArray<ServerProviderModel> =
    discovered.length === 0
      ? DEEPSEEK_BUILT_IN_MODELS
      : discovered.map((model) => ({
          slug: model.id,
          name: model.name,
          isCustom: false,
          ...(model.id === probe?.currentModelId ? { isDefault: true } : {}),
          capabilities,
        }));
  return providerModelsFromSettings(builtIn, settings.customModels ?? [], capabilities);
}

function snapshot(
  settings: DeepseekSettings,
  checkedAt: string,
  probe: ProviderProbeResult,
  modelsProbe?: DeepseekProbeResult,
): ServerProviderDraft {
  return buildServerProvider({
    driver: DEEPSEEK_PROVIDER,
    presentation: DEEPSEEK_PRESENTATION,
    enabled: settings.enabled,
    checkedAt,
    models: deepseekModels(settings, modelsProbe),
    probe,
  });
}

export const buildInitialDeepseekProviderSnapshot = Effect.fn(
  "DeepseekProvider.buildInitialDeepseekProviderSnapshot",
)(function* (settings: DeepseekSettings): Effect.fn.Return<ServerProviderDraft> {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  return snapshot(settings, checkedAt, {
    installed: false,
    version: null,
    status: "warning",
    auth: { status: "unknown" },
    message: settings.enabled
      ? "Checking DeepSeek Harness availability..."
      : "DeepSeek is disabled in T3 Code settings.",
  });
});

const spawnDshVersion = Effect.fn("DeepseekProvider.spawnDshVersion")(function* (
  settings: DeepseekSettings,
  environment: NodeJS.ProcessEnv,
) {
  const command = settings.binaryPath || "dsh";
  const spawnCommand = yield* resolveSpawnCommand(command, ["--version"], { env: environment });
  return yield* spawnAndCollect(
    command,
    ChildProcess.make(spawnCommand.command, spawnCommand.args, {
      env: environment,
      shell: spawnCommand.shell,
    }),
  );
});

const readDshVersion = (settings: DeepseekSettings, environment: NodeJS.ProcessEnv) =>
  spawnDshVersion(settings, environment).pipe(
    Effect.timeoutOrElse({
      duration: VERSION_PROBE_TIMEOUT,
      orElse: () => Effect.undefined,
    }),
    Effect.catch(() => Effect.undefined),
  );

export interface DeepseekStatusInput {
  readonly settings: DeepseekSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly cwd: string;
}

export const checkDeepseekProviderStatus = Effect.fn("DeepseekProvider.checkProviderStatus")(
  function* (
    input: DeepseekStatusInput,
  ): Effect.fn.Return<
    ServerProviderDraft,
    never,
    ChildProcessSpawner.ChildProcessSpawner | SecureRandom.SecureRandom
  > {
    const { settings, environment, cwd } = input;
    const checkedAt = DateTime.formatIso(yield* DateTime.now);
    const auth = deepseekAuth(settings, environment);
    if (!settings.enabled) {
      return snapshot(settings, checkedAt, {
        installed: false,
        version: null,
        status: "warning",
        auth,
        message: "DeepSeek is disabled in T3 Code settings.",
      });
    }

    const versionOutput = yield* readDshVersion(settings, environment);
    if (versionOutput === undefined || versionOutput.code !== 0) {
      return snapshot(settings, checkedAt, {
        installed: false,
        version: null,
        status: "error",
        auth,
        message:
          "DeepSeek Harness (dsh) was not found on this environment. Set the executable path in provider settings.",
      });
    }

    const probed = yield* probeDeepseekSession({ settings, cwd, environment }).pipe(Effect.result);
    if (Result.isFailure(probed)) {
      return snapshot(settings, checkedAt, {
        installed: true,
        version: parseGenericCliVersion(versionOutput.stdout),
        status: "warning",
        auth,
        message: probed.failure.message,
      });
    }

    return snapshot(
      settings,
      checkedAt,
      {
        installed: true,
        version: parseGenericCliVersion(versionOutput.stdout),
        status: "ready",
        auth,
      },
      probed.success,
    );
  },
);
