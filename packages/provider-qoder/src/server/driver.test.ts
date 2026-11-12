import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import { QoderSettings } from "../settings.ts";
import { buildQoderAcpSpawnInput } from "./acpSupport.ts";
import { qoderProbeResult, type QoderSessionSetup } from "./probe.ts";

const decodeSettings = Schema.decodeUnknownSync(QoderSettings);

describe("Qoder driver", () => {
  it("starts the documented ACP server from the configured binary", () => {
    assert.deepEqual(buildQoderAcpSpawnInput(decodeSettings({}), "/work"), {
      command: "qoder",
      args: ["--acp"],
      cwd: "/work",
    });
    const custom = buildQoderAcpSpawnInput(
      decodeSettings({ binaryPath: "/opt/qoder/bin/qoder" }),
      "/work",
      { PATH: "/usr/bin" },
    );
    assert.equal(custom.command, "/opt/qoder/bin/qoder");
    assert.deepEqual(custom.args, ["--acp"]);
    assert.deepEqual(custom.env, { PATH: "/usr/bin" });
  });

  it("reads the model and option descriptors Qoder advertises", () => {
    const setup: QoderSessionSetup = {
      configOptions: [
        {
          id: "model",
          name: "Model",
          category: "model",
          type: "select",
          currentValue: "qwen3-coder-plus",
          options: [
            { value: "qwen3-coder-plus", name: "Qwen3 Coder Plus" },
            { value: "qwen3-coder", name: "Qwen3 Coder" },
          ],
        },
        {
          id: "thought_level",
          name: "Thinking",
          category: "thought_level",
          type: "select",
          currentValue: "high",
          options: [
            { value: "low", name: "Low" },
            { value: "high", name: "High" },
          ],
        },
      ],
    };

    const result = qoderProbeResult(setup, "1.0.0");

    assert.deepEqual(result.models, [
      { id: "qwen3-coder-plus", name: "Qwen3 Coder Plus" },
      { id: "qwen3-coder", name: "Qwen3 Coder" },
    ]);
    assert.equal(result.currentModelId, "qwen3-coder-plus");
    assert.deepEqual(
      result.optionDescriptors.map((descriptor) => descriptor.id),
      ["thought_level"],
    );
  });
});
