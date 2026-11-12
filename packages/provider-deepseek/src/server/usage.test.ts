import { assert, describe, it } from "@effect/vitest";

import { parseDeepseekRecord, deepseekUsageFormat } from "./usage.ts";

const initialState = { sessionId: "" };

describe("DeepSeek usage", () => {
  // Captured from a DeepSeek Harness 0.2.2 session file.
  it("reads one record per assistant step and carries the session id", () => {
    assert.deepEqual(
      parseDeepseekRecord(
        { type: "session", version: 4, id: "session-f46a666e-0448-41c8-aac7-4f8c4450b862" },
        initialState,
      ),
      [],
    );
    assert.equal(initialState.sessionId, "session-f46a666e-0448-41c8-aac7-4f8c4450b862");

    const records = parseDeepseekRecord(
      {
        type: "assistant/message",
        seq: 20,
        time: 1794405947151,
        data: {
          turn: 1,
          step: 1,
          message: {
            role: "assistant",
            source: { kind: "model", provider: "deepseek-account", model: "deepseek-flash" },
          },
          usage: {
            inputTokens: 589,
            outputTokens: 153,
            cacheReadTokens: 17024,
            cacheWriteTokens: 0,
            totalTokens: 17766,
          },
        },
      },
      initialState,
    );

    assert.deepEqual(records, [
      {
        provider: "deepseek",
        timestampMs: 1794405947151,
        model: "deepseek-flash",
        sessionId: "session-f46a666e-0448-41c8-aac7-4f8c4450b862",
        totals: {
          uncachedInputTokens: 589,
          cachedInputTokens: 17024,
          cacheCreationTokens: 0,
          outputTokens: 153,
          reasoningTokens: 0,
        },
        reportedCostUsd: null,
        speed: "standard",
        dedupeKey: "deepseek:session-f46a666e-0448-41c8-aac7-4f8c4450b862:20",
      },
    ]);
  });

  it(`skips lines ${deepseekUsageFormat.usageMarkers.join(" and ")} without harness usage`, () => {
    assert.deepEqual(
      parseDeepseekRecord(
        { type: "tool/call", seq: 21, time: 1794405947152, data: { name: "bash" } },
        initialState,
      ),
      [],
    );
    assert.deepEqual(
      parseDeepseekRecord(
        {
          type: "assistant/message",
          seq: 22,
          time: 1794405947153,
          data: { usage: { inputTokens: 0, outputTokens: 0 } },
        },
        initialState,
      ),
      [],
    );
  });

  it("keeps the session id out of dedupe keys when the harness omits seq", () => {
    const [record] = parseDeepseekRecord(
      {
        type: "assistant/message",
        time: 1794405947151,
        data: { usage: { inputTokens: 5, outputTokens: 2 } },
      },
      { sessionId: "session-a" },
    );
    assert.equal(record?.dedupeKey, null);
    assert.equal(record?.model, "DeepSeek");
  });
});
