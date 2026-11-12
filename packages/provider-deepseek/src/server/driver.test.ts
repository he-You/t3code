import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";

import { DeepseekSettings } from "../settings.ts";
import { buildDeepseekAcpSpawnInput, deepseekAcpArgs, withDeepseekApiKey } from "./acpSupport.ts";
import { deepseekProbeResult, type DeepseekSessionSetup } from "./probe.ts";

const decodeSettings = Schema.decodeUnknownSync(DeepseekSettings);

describe("DeepSeek driver", () => {
  it("boots the shipped ACP profile from the configured executable", () => {
    assert.deepEqual(deepseekAcpArgs(undefined), ["--profile", "acp"]);
    assert.deepEqual(deepseekAcpArgs("work"), ["--profile", "work"]);
    assert.deepEqual(buildDeepseekAcpSpawnInput(decodeSettings({}), "/work"), {
      command: "dsh",
      args: ["--profile", "acp"],
      cwd: "/work",
    });
    const custom = buildDeepseekAcpSpawnInput(
      decodeSettings({ binaryPath: "/opt/deepseek/dsh", profile: "lab" }),
      "/work",
      { PATH: "/usr/bin" },
    );
    assert.equal(custom.command, "/opt/deepseek/dsh");
    assert.deepEqual(custom.args, ["--profile", "lab"]);
    assert.deepEqual(custom.env, { PATH: "/usr/bin" });
  });

  it("passes a configured key as DEEPSEEK_API_KEY without dropping the host environment", () => {
    const environment = withDeepseekApiKey(decodeSettings({ apiKey: "sk-test" }), {
      PATH: "/usr/bin",
      DEEPSEEK_API_KEY: "ambient",
    });
    assert.deepEqual(environment, { PATH: "/usr/bin", DEEPSEEK_API_KEY: "sk-test" });
    assert.deepEqual(withDeepseekApiKey(decodeSettings({}), { PATH: "/usr/bin" }), {
      PATH: "/usr/bin",
    });
  });

  // Captured from `dsh --profile acp` (DeepSeek Harness 0.2.2) answering
  // initialize and session/new. The model is a JSON ACP option value.
  it("reads the DeepSeek models and reasoning levels the harness advertises", () => {
    const setup: DeepseekSessionSetup = {
      configOptions: [
        {
          id: "model",
          name: "Model",
          category: "model",
          type: "select",
          currentValue: '["deepseek-official","deepseek-v4-flash"]',
          options: [
            {
              groupId: "deepseek-official",
              name: "DeepSeek",
              options: [
                {
                  value: '["deepseek-official","deepseek-v4-flash"]',
                  name: "deepseek-v4-flash",
                },
              ],
            },
          ],
        },
        {
          id: "reasoning_effort",
          name: "Reasoning effort",
          category: "thought_level",
          type: "select",
          currentValue: "high",
          options: [
            { value: "off", name: "Off", description: "No reasoning." },
            { value: "high", name: "High" },
            { value: "max", name: "Max" },
          ],
        },
      ],
    };

    const result = deepseekProbeResult(setup, "0.0.1");

    assert.deepEqual(result.models, [
      {
        id: '["deepseek-official","deepseek-v4-flash"]',
        name: "deepseek-v4-flash",
      },
    ]);
    assert.equal(result.currentModelId, '["deepseek-official","deepseek-v4-flash"]');
    assert.equal(result.agentVersion, "0.0.1");
    assert.deepEqual(result.optionDescriptors, [
      {
        id: "reasoning_effort",
        label: "Reasoning effort",
        type: "select",
        role: "reasoning",
        options: [
          { id: "off", label: "Off", description: "No reasoning." },
          { id: "high", label: "High" },
          { id: "max", label: "Max" },
        ],
        currentValue: "high",
      },
    ]);
  });

  it("falls back to session models when the harness does not use a model config option", () => {
    const result = deepseekProbeResult(
      {
        models: {
          currentModelId: "deepseek-v4-flash",
          availableModels: [
            { modelId: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
            { modelId: "deepseek-v4", name: "DeepSeek V4" },
          ],
        },
      },
      undefined,
    );

    assert.deepEqual(result.models, [
      { id: "deepseek-v4-flash", name: "DeepSeek V4 Flash" },
      { id: "deepseek-v4", name: "DeepSeek V4" },
    ]);
    assert.equal(result.currentModelId, "deepseek-v4-flash");
    assert.deepEqual(result.optionDescriptors, []);
  });
});
