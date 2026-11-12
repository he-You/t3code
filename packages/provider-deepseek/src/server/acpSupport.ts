import type { DeepseekSettings } from "../settings.ts";
import { DEEPSEEK_DEFAULT_PROFILE } from "../settings.ts";
import { ProviderDriverKind, settingsSecretLiteral } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as SecureRandom from "effect/crypto/SecureRandom";
import type * as Scope from "effect/Scope";
import type * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import type * as EffectAcpErrors from "effect-acp/errors";

import * as AcpSessionRuntime from "@t3tools/provider-acp/server/AcpSessionRuntime";

export const DEEPSEEK_PROVIDER = ProviderDriverKind.make("deepseek");

export const DEEPSEEK_API_KEY_ENV = "DEEPSEEK_API_KEY";

export type DeepseekAcpSettings = Pick<DeepseekSettings, "binaryPath" | "profile">;

/** Adds the instance's API key to the child environment without trusting an ambient one. */
export function withDeepseekApiKey(
  settings: Pick<DeepseekSettings, "apiKey">,
  environment: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const apiKey = settingsSecretLiteral(settings.apiKey).trim();
  return apiKey.length === 0 ? environment : { ...environment, [DEEPSEEK_API_KEY_ENV]: apiKey };
}

/**
 * `dsh` selects a profile before its app arguments: `dsh --profile acp`. The
 * shipped `acp` profile serves Agent Client Protocol over stdio.
 */
export function deepseekAcpArgs(profile: string | undefined): ReadonlyArray<string> {
  return ["--profile", profile?.trim() || DEEPSEEK_DEFAULT_PROFILE];
}

export function buildDeepseekAcpSpawnInput(
  settings: DeepseekAcpSettings | null | undefined,
  cwd: string,
  environment?: NodeJS.ProcessEnv,
): AcpSessionRuntime.AcpSpawnInput {
  return {
    command: settings?.binaryPath || "dsh",
    args: [...deepseekAcpArgs(settings?.profile)],
    cwd,
    ...(environment === undefined ? {} : { env: environment }),
  };
}

export interface DeepseekAcpRuntimeInput extends Omit<
  AcpSessionRuntime.AcpSessionRuntimeOptions,
  "authMethodId" | "spawn"
> {
  readonly settings: DeepseekAcpSettings | null | undefined;
  readonly environment?: NodeJS.ProcessEnv;
}

export const makeDeepseekAcpRuntime = Effect.fn("DeepseekAcpSupport.makeDeepseekAcpRuntime")(
  function* (
    input: DeepseekAcpRuntimeInput,
  ): Effect.fn.Return<
    AcpSessionRuntime.AcpSessionRuntime["Service"],
    EffectAcpErrors.AcpError,
    ChildProcessSpawner.ChildProcessSpawner | SecureRandom.SecureRandom | Scope.Scope
  > {
    const { settings, environment, ...runtimeOptions } = input;
    const context = yield* Layer.build(
      AcpSessionRuntime.layer({
        ...runtimeOptions,
        spawn: buildDeepseekAcpSpawnInput(settings, input.cwd, environment),
      }),
    );
    return yield* Effect.service(AcpSessionRuntime.AcpSessionRuntime).pipe(Effect.provide(context));
  },
);
