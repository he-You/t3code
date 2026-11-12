import type { ZcodeSettings } from "../settings.ts";
import { ProviderDriverKind } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import type * as SecureRandom from "effect/crypto/SecureRandom";
import type * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import type * as EffectAcpErrors from "effect-acp/errors";

import * as AcpSessionRuntime from "@t3tools/provider-acp/server/AcpSessionRuntime";

export const ZCODE_PROVIDER = ProviderDriverKind.make("zcode");

/**
 * The community `zcode-acp` bridge is itself the ACP server: its
 * `zcode-acp-server` bin speaks ACP on stdio and drives `zcode app-server`.
 */
export const ZCODE_ACP_ARGS: ReadonlyArray<string> = [];

export type ZcodeAcpSettings = Pick<ZcodeSettings, "binaryPath">;

export function buildZcodeAcpSpawnInput(
  settings: ZcodeAcpSettings | null | undefined,
  cwd: string,
  environment?: NodeJS.ProcessEnv,
): AcpSessionRuntime.AcpSpawnInput {
  return {
    command: settings?.binaryPath || "zcode-acp-server",
    args: [...ZCODE_ACP_ARGS],
    cwd,
    ...(environment === undefined ? {} : { env: environment }),
  };
}

export interface ZcodeAcpRuntimeInput extends Omit<
  AcpSessionRuntime.AcpSessionRuntimeOptions,
  "authMethodId" | "spawn"
> {
  readonly settings: ZcodeAcpSettings | null | undefined;
  readonly environment?: NodeJS.ProcessEnv;
}

export const makeZcodeAcpRuntime = Effect.fn("ZcodeAcpSupport.makeZcodeAcpRuntime")(function* (
  input: ZcodeAcpRuntimeInput,
): Effect.fn.Return<
  AcpSessionRuntime.AcpSessionRuntime["Service"],
  EffectAcpErrors.AcpError,
  ChildProcessSpawner.ChildProcessSpawner | SecureRandom.SecureRandom | Scope.Scope
> {
  const { settings, environment, ...runtimeOptions } = input;
  const context = yield* Layer.build(
    AcpSessionRuntime.layer({
      ...runtimeOptions,
      spawn: buildZcodeAcpSpawnInput(settings, input.cwd, environment),
    }),
  );
  return yield* Effect.service(AcpSessionRuntime.AcpSessionRuntime).pipe(Effect.provide(context));
});
