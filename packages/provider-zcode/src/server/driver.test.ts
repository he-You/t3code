import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import { ZcodeSettings } from "../settings.ts";
import { buildZcodeAcpSpawnInput } from "./acpSupport.ts";
import { zcodeProbeResult, type ZcodeSessionSetup } from "./probe.ts";

const decodeSettings = Schema.decodeUnknownSync(ZcodeSettings);

describe("ZCode driver", () => {
  it("launches the ACP bridge from the configured executable", () => {
    assert.deepEqual(buildZcodeAcpSpawnInput(decodeSettings({}), "/work"), {
      command: "zcode-acp-server",
      args: [],
      cwd: "/work",
    });
    const custom = buildZcodeAcpSpawnInput(
      decodeSettings({ binaryPath: "/opt/zcode-acp/dist/index.js" }),
      "/work",
      { ZCODE_BIN: "/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs" },
    );
    assert.equal(custom.command, "/opt/zcode-acp/dist/index.js");
    assert.deepEqual(custom.args, []);
    assert.deepEqual(custom.env, {
      ZCODE_BIN: "/Applications/ZCode.app/Contents/Resources/glm/zcode.cjs",
    });
  });

  it("reads GLM models and thought levels from the bridge session", () => {
    const setup: ZcodeSessionSetup = {
      configOptions: [
        {
          id: "model",
          name: "Model",
          category: "model",
          type: "select",
          currentValue: "glm-5",
          options: [
            { value: "glm-5", name: "GLM-5" },
            { value: "glm-4.7", name: "GLM-4.7" },
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

    const result = zcodeProbeResult(setup, "0.1.0");

    assert.deepEqual(result.models, [
      { id: "glm-5", name: "GLM-5" },
      { id: "glm-4.7", name: "GLM-4.7" },
    ]);
    assert.equal(result.currentModelId, "glm-5");
    assert.deepEqual(
      result.optionDescriptors.map((descriptor) => descriptor.id),
      ["thought_level"],
    );
  });
});
