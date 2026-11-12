import {
  parseTimestampMs,
  tokenCount,
  totalTokens,
  type ProviderUsageReader,
  type TranscriptUsageFormat,
  type UsageRecord,
} from "@t3tools/provider-core/server/usage";
import { expandHomePath } from "@t3tools/provider-core/server/pathExpansion";
import type { DeepseekSettings } from "../settings.ts";
import * as HostProcess from "@t3tools/shared/HostProcess";
import * as Effect from "effect/Effect";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

const DSH_SESSION_FILE = "session.v4.jsonl.zstd";

const DeepseekScanState = Schema.Struct({ sessionId: Schema.mutableKey(Schema.String) });

function object(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/**
 * DeepSeek Harness writes one assistant record per model step, with its own
 * usage. `inputTokens` excludes cache reads, matching T3's uncached total.
 */
export function parseDeepseekRecord(
  parsed: unknown,
  state: typeof DeepseekScanState.Type,
): readonly UsageRecord[] {
  const entry = object(parsed);
  if (entry.type === "session") {
    const id = text(entry.id);
    if (id !== undefined) state.sessionId = id;
    return [];
  }
  if (entry.type !== "assistant/message") return [];
  const data = object(entry.data);
  const usage = object(data.usage);
  const timestampMs = typeof entry.time === "number" ? entry.time : parseTimestampMs(entry.time);
  if (timestampMs === null) return [];
  const totals = {
    uncachedInputTokens: tokenCount(usage.inputTokens),
    cachedInputTokens: tokenCount(usage.cacheReadTokens),
    cacheCreationTokens: tokenCount(usage.cacheWriteTokens),
    outputTokens: tokenCount(usage.outputTokens),
    // Harness usage does not separate reasoning from output.
    reasoningTokens: 0,
  };
  if (totalTokens(totals) === 0) return [];
  const source = object(object(data.message).source);
  const model = text(source.model) ?? "DeepSeek";
  const seq = typeof entry.seq === "number" ? entry.seq : undefined;
  return [
    {
      provider: "deepseek",
      timestampMs,
      model,
      sessionId: state.sessionId,
      totals,
      // The harness records tokens only; shared model pricing estimates the cost.
      reportedCostUsd: null,
      speed: "standard",
      dedupeKey: seq === undefined ? null : `deepseek:${state.sessionId}:${seq}`,
    },
  ];
}

export const deepseekUsageFormat: TranscriptUsageFormat<typeof DeepseekScanState.Type> = {
  selectFields: {
    type: true,
    seq: true,
    time: true,
    id: true,
    data: { usage: true, message: { source: { provider: true, model: true } } },
  },
  usageMarkers: ['"usage"', '"type":"session"'],
  parseLine: (line, state) => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(line);
    } catch {
      return [];
    }
    return parseDeepseekRecord(parsed, state);
  },
  parseProjected: parseDeepseekRecord,
  state: { initial: () => ({ sessionId: "" }), schema: DeepseekScanState },
};

export const deepseekUsageReader: ProviderUsageReader<DeepseekSettings, Path.Path> = {
  kind: "transcripts",
  provider: "deepseek",
  format: deepseekUsageFormat,
  directories: Effect.fn("deepseekUsageReader.directories")(function* ({ environment }) {
    const path = yield* Path.Path;
    const platform = yield* HostProcess.Platform;
    const hostHome = yield* HostProcess.HomeDirectory;
    // The instance environment may point HOME somewhere else, like the harness itself reads it.
    const environmentHome = platform === "win32" ? environment.USERPROFILE : environment.HOME;
    const home = environmentHome?.trim() ? environmentHome.trim() : hostHome;
    const configuredHome = environment.DSH_HOME?.trim();
    const dshHome =
      configuredHome === undefined || configuredHome.length === 0
        ? path.join(home, ".dsh")
        : path.resolve(expandHomePath(configuredHome, home));
    return [{ dir: path.join(dshHome, "sessions"), fileName: DSH_SESSION_FILE }];
  }),
};
