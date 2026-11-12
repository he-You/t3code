import type { QoderSettings } from "../settings.ts";
import { ProviderDriverKind } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Scope from "effect/Scope";
import type * as SecureRandom from "effect/crypto/SecureRandom";
import type * as ChildProcessSpawner from "effect/process/ChildProcessSpawner";
import type * as EffectAcpErrors from "effect-acp/errors";

import * as AcpSessionRuntime from "@t3tools/provider-acp/server/AcpSessionRuntime";

export const QODER_PROVIDER = ProviderDriverKind.make("qoder");

/** Qoder CLI serves ACP over stdio when launched with `--acp`. */
export const QODER_ACP_ARGS = ["--acp"] as const;

export type QoderAcpSettings = Pick<QoderSettings, "binaryPath">;

export function buildQoderAcpSpawnInput(
  settings: QoderAcpSettings | null | undefined,
  cwd: string,
  environment?: NodeJS.ProcessEnv,
): AcpSessionRuntime.AcpSpawnInput {
  return {
    command: settings?.binaryPath || "qoder",
    args: [...QODER_ACP_ARGS],
    cwd,
    ...(environment === undefined ? {} : { env: environment }),
  };
}

export interface QoderAcpRuntimeInput extends Omit<
  AcpSessionRuntime.AcpSessionRuntimeOptions,
  "authMethodId" | "spawn"
> {
  readonly settings: QoderAcpSettings | null | undefined;
  readonly environment?: NodeJS.ProcessEnv;
}

export const makeQoderAcpRuntime = Effect.fn("QoderAcpSupport.makeQoderAcpRuntime")(function* (
  input: QoderAcpRuntimeInput,
): Effect.fn.Return<
  AcpSessionRuntime.AcpSessionRuntime["Service"],
  EffectAcpErrors.AcpError,
  ChildProcessSpawner.ChildProcessSpawner | SecureRandom.SecureRandom | Scope.Scope
> {
  const { settings, environment, ...runtimeOptions } = input;
  const context = yield* Layer.build(
    AcpSessionRuntime.layer({
      ...runtimeOptions,
      spawn: buildQoderAcpSpawnInput(settings, input.cwd, environment),
    }),
  );
  return yield* Effect.service(AcpSessionRuntime.AcpSessionRuntime).pipe(Effect.provide(context));
});
