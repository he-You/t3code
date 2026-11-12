import {
  type ModelCapabilities,
  type ServerProviderAuth,
  type ServerProviderModel,
} from "@t3tools/contracts";
import type { QoderSettings } from "../settings.ts";
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
import { QODER_PROVIDER } from "./acpSupport.ts";
import { probeQoderSession, type QoderProbeResult } from "./probe.ts";

const QODER_PRESENTATION = {
  displayName: "Qoder",
  showInteractionModeToggle: false,
} as const;
const EMPTY_CAPABILITIES: ModelCapabilities = createModelCapabilities({
  optionDescriptors: [],
});
/** T3's slug for "whatever model Qoder starts with". */
export const QODER_DEFAULT_MODEL_SLUG = "default";
const QODER_BUILT_IN_MODELS: ReadonlyArray<ServerProviderModel> = [
  {
    slug: QODER_DEFAULT_MODEL_SLUG,
    name: "Qoder default",
    isCustom: false,
    isDefault: true,
    capabilities: EMPTY_CAPABILITIES,
  },
];

// Qoder keeps sign-in in its own store; an ACP discovery session proves readiness.
const QODER_AUTH: ServerProviderAuth = { status: "unknown" };

function qoderModels(
  settings: QoderSettings,
  probe: QoderProbeResult | undefined,
): ReadonlyArray<ServerProviderModel> {
  const discovered = probe?.models ?? [];
  const capabilities =
    probe === undefined || probe.optionDescriptors.length === 0
      ? EMPTY_CAPABILITIES
      : createModelCapabilities({ optionDescriptors: probe.optionDescriptors });
  const builtIn: ReadonlyArray<ServerProviderModel> =
    discovered.length === 0
      ? QODER_BUILT_IN_MODELS
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
  settings: QoderSettings,
  checkedAt: string,
  probe: ProviderProbeResult,
  modelsProbe?: QoderProbeResult,
): ServerProviderDraft {
  return buildServerProvider({
    driver: QODER_PROVIDER,
    presentation: QODER_PRESENTATION,
    enabled: settings.enabled,
    checkedAt,
    models: qoderModels(settings, modelsProbe),
    probe,
  });
}

export const buildInitialQoderProviderSnapshot = Effect.fn(
  "QoderProvider.buildInitialQoderProviderSnapshot",
)(function* (settings: QoderSettings): Effect.fn.Return<ServerProviderDraft> {
  const checkedAt = DateTime.formatIso(yield* DateTime.now);
  return snapshot(settings, checkedAt, {
    installed: false,
    version: null,
    status: "warning",
    auth: QODER_AUTH,
    message: settings.enabled
      ? "Checking Qoder CLI availability..."
      : "Qoder is disabled in T3 Code settings.",
  });
});

export interface QoderStatusInput {
  readonly settings: QoderSettings;
  readonly environment: NodeJS.ProcessEnv;
  readonly cwd: string;
}

export const checkQoderProviderStatus = Effect.fn("QoderProvider.checkProviderStatus")(function* (
  input: QoderStatusInput,
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
      auth: QODER_AUTH,
      message: "Qoder is disabled in T3 Code settings.",
    });
  }

  const probed = yield* probeQoderSession({ settings, cwd, environment }).pipe(Effect.result);
  if (Result.isFailure(probed)) {
    const missing = probed.failure.spawnFailed === true;
    return snapshot(settings, checkedAt, {
      installed: !missing,
      version: null,
      status: missing ? "error" : "warning",
      auth: QODER_AUTH,
      message: missing
        ? "Qoder CLI (qoder) was not found on this environment. Set the executable path in provider settings."
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
      auth: QODER_AUTH,
    },
    probed.success,
  );
});
