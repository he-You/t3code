import type { ProviderOptionDescriptor } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import * as SecureRandom from "effect/crypto/SecureRandom";
import type * as EffectAcpSchema from "effect-acp/compat";

import * as AcpSessionRuntime from "@t3tools/provider-acp/server/AcpSessionRuntime";
import {
  findModelConfigOption,
  parseSessionModeState,
  type AcpSessionModeState,
} from "@t3tools/provider-acp/server/runtimeModel";
import {
  acpProviderOptionDescriptors,
  flattenSelectChoices,
} from "@t3tools/provider-acp/server/sessionConfig";

import type { DeepseekSettings } from "../settings.ts";
import { buildDeepseekAcpSpawnInput } from "./acpSupport.ts";

const PROBE_TIMEOUT = "30 seconds";

export interface DeepseekProbeModel {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
}

export interface DeepseekProbeResult {
  readonly models: ReadonlyArray<DeepseekProbeModel>;
  readonly currentModelId: string | null;
  readonly optionDescriptors: ReadonlyArray<ProviderOptionDescriptor>;
  readonly agentVersion: string | undefined;
}

export interface DeepseekProbeFailure {
  readonly message: string;
}

export type DeepseekSessionSetup = Pick<
  EffectAcpSchema.NewSessionResponse,
  "configOptions" | "models" | "modes"
>;

/**
 * DeepSeek Harness advertises its models as the `model` session config option
 * of `session/new`, not in `initialize`, so discovery opens one session.
 */
export function deepseekProbeResult(
  setup: DeepseekSessionSetup,
  agentVersion: string | undefined,
): DeepseekProbeResult {
  const configOptions = setup.configOptions ?? [];
  const modelOption = findModelConfigOption(configOptions);
  const candidates =
    modelOption === undefined
      ? (setup.models?.availableModels ?? []).map((model) => ({
          value: model.modelId,
          name: model.name,
          description: model.description ?? undefined,
        }))
      : flattenSelectChoices(modelOption.options);
  const seen = new Set<string>();
  const models: Array<DeepseekProbeModel> = [];
  for (const candidate of candidates) {
    const id = candidate.value.trim();
    if (id.length === 0 || seen.has(id)) continue;
    seen.add(id);
    const description = candidate.description?.trim();
    models.push({
      id,
      name: candidate.name.trim() || id,
      ...(description ? { description } : {}),
    });
  }
  const currentValue =
    modelOption?.type === "select" ? modelOption.currentValue : setup.models?.currentModelId;
  const currentModelId =
    currentValue !== undefined && models.some((model) => model.id === currentValue)
      ? currentValue
      : null;
  const modeState: AcpSessionModeState | undefined = parseSessionModeState(setup);
  return {
    models,
    currentModelId,
    optionDescriptors: acpProviderOptionDescriptors({ configOptions, modeState }),
    agentVersion,
  };
}

export interface DeepseekProbeInput {
  readonly settings: Pick<DeepseekSettings, "binaryPath" | "profile">;
  readonly cwd: string;
  readonly environment: NodeJS.ProcessEnv;
}

function probeFailureMessage(cause: unknown): string {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "message" in cause &&
    typeof cause.message === "string" &&
    cause.message.trim().length > 0
  ) {
    return cause.message;
  }
  return "DeepSeek Harness did not start an ACP session.";
}

const runDeepseekProbe = Effect.fn("DeepseekProbe.run")(function* (
  input: DeepseekProbeInput,
): Effect.fn.Return<
  DeepseekProbeResult,
  DeepseekProbeFailure,
  ChildProcessSpawner.ChildProcessSpawner | SecureRandom.SecureRandom | Scope.Scope
> {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner;
  const random = yield* SecureRandom.SecureRandom;
  const runtimeContext = yield* Layer.build(
    AcpSessionRuntime.layer({
      spawn: buildDeepseekAcpSpawnInput(input.settings, input.cwd, input.environment),
      cwd: input.cwd,
      clientCapabilities: {
        fs: { readTextFile: false, writeTextFile: false },
        terminal: false,
      },
      clientInfo: { name: "t3-code-deepseek-probe", version: "0.0.0" },
      authenticateOnAuthRequired: false,
    }).pipe(
      Layer.provide(
        Layer.mergeAll(
          Layer.succeed(ChildProcessSpawner.ChildProcessSpawner, spawner),
          Layer.succeed(SecureRandom.SecureRandom, random),
        ),
      ),
    ),
  );
  const runtime = yield* Effect.service(AcpSessionRuntime.AcpSessionRuntime).pipe(
    Effect.provide(runtimeContext),
  );
  const started = yield* runtime.start();
  const result = deepseekProbeResult(
    started.sessionSetupResult,
    started.initializeResult.agentInfo?.version,
  );
  // Close the discovery session so repeated status checks do not pile up in the harness.
  yield* runtime.closeSession(started.sessionId).pipe(Effect.ignore);
  return result;
});

export const probeDeepseekSession = (
  input: DeepseekProbeInput,
): Effect.Effect<
  DeepseekProbeResult,
  DeepseekProbeFailure,
  ChildProcessSpawner.ChildProcessSpawner | SecureRandom.SecureRandom
> =>
  runDeepseekProbe(input).pipe(
    Effect.scoped,
    Effect.timeoutOrElse({
      duration: PROBE_TIMEOUT,
      orElse: () =>
        Effect.fail({
          message: "DeepSeek Harness did not start an ACP session in time.",
        } satisfies DeepseekProbeFailure),
    }),
    Effect.mapError((cause) => ({
      message: probeFailureMessage(cause),
    })),
  );
