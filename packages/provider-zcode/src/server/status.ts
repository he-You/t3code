import {
  type ModelCapabilities,
  type ServerProviderAuth,
  type ServerProviderModel,
} from "@t3tools/contracts";
import type { ZcodeSettings } from "../settings.ts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import type * as SecureRandom from "effect/crypto/SecureRandom";
import { createModelCapabilities } from "@t3tools/shared/model";

import {
  buildServerProvider,
  type ProviderProbeResult,
  providerModelsFromSettings,
  type ServerProviderDraft,
} from "@t3tools/provider-core/server/snapshotProbe";
import { ZCODE_PROVIDER } from "./acpSupport.ts";
import { probeZcodeSession, type ZcodeProbeResult } from "./probe.ts";

const ZCODE_PRESENTATION = {
  displayName: "ZCode",
  showInteractionModeToggle: false,
} as const;
const EMPTY_CAPABILITIES: ModelCapabilities = createModelCapabilities({
  optionDescriptors: [],
});
export const ZCODE_DEFAULT_MODEL_SLUG = "default";
const ZCODE_BUILT_IN_MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: ZCODE_DEFAULT_MODEL_SLUG,
    name: "ZCode default",
    isCustom: false,
    isDefault: true,
    capabilities: EMPTY_CAPABILITIES,
  },
];

// ZCode keeps GLM Coding Plan credentials in ~/.zcode; the bridge reports no ACP auth state.
const ZCODE_AUTH: ServerProviderAuth = { status: "unknown" };

function zcodeModels(
  settings: ZcodeSettings,
  probe: ZcodeProbeResult | undefined,
): ReadonlyArray<ServerProviderModel> {
  const discovered = probe?.models ?? [];
  const capabilities =
    probe === undefined || probe.optionDescriptors.length === 0
      ? EMPTY_CAPABILITIES
      : createModelCapabilities({ optionDescriptors: probe.optionDescriptors });
  const builtIn: ReadonlyArray<ServerProviderModel> =
    discovered.length === 0
      ? ZCODE_BUILT_IN_MODELS
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
  settings: ZcodeSettings,
  checkedAt: string,
  probe: ProviderProbeResult,
  modelsProbe?: ZcodeProbeResult,
): ServerProviderDraft {
  return buildServerProvider({
    driver: ZCODE_PROVIDER,
    presentation: ZCODE_PRESENTATION,
    enabled: settings.enabled,
    checkedAt,
    models: zcodeModels(settings, modelsProbe),
    probe,
  });
}

export const buildInitialZcodeProviderSnapshot = Effect.fn(
  "ZcodeProvider.buildInitialZcodeProviderSnapshot",
)(function* (settings: ZcodeSettings): Effect.fn.Return<ServerProviderDraft> {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  return snapshot(settings, checkedAt, {
    installed: false,
    version: null,
    status: "warning",
    auth: ZCODE_AUTH,
    message: settings.enabled
      ? "Checking the ZCode ACP bridge..."
      : "ZCode is disabled in T3 Code settings.",
  });
});

export interface ZcodeStatusInput {
  readonly settings: ZcodeSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly cwd: string;
}

export const checkZcodeProviderStatus = Effect.fn("ZcodeProvider.checkProviderStatus")(function* (
  input: ZcodeStatusInput,
): Effect.fn.Return<
  ServerProviderDraft,
  never,
  ChildProcessSpawner.ChildProcessSpawner | SecureRandom.SecureRandom
> {
  const { settings, environment, cwd } = input;
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  if (!settings.enabled) {
    return snapshot(settings, checkedAt, {
      installed: false,
      version: null,
      status: "warning",
      auth: ZCODE_AUTH,
      message: "ZCode is disabled in T3 Code settings.",
    });
  }

  const probed = yield* probeZcodeSession({ settings, cwd, environment }).pipe(Effect.result);
  if (Result.isFailure(probed)) {
    const missing = probed.failure.spawnFailed === true;
    return snapshot(settings, checkedAt, {
      installed: !missing,
      version: null,
      status: missing ? "error" : "warning",
      auth: ZCODE_AUTH,
      message: missing
        ? "The ZCode ACP bridge (zcode-acp-server) was not found. Install `zcode-acp` or set the bridge path."
        : probed.failure.message,
    });
  }

  return snapshot(
    settings,
    checkedAt,
    {
      installed: true,
      version: probed.success.agentVersion ?? null,
      status: "ready",
      auth: ZCODE_AUTH,
    },
    probed.success,
  );
});
