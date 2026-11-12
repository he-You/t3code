import {
  CustomModelSetting,
  makeBinaryPathSetting,
  makeProviderSettingsSchema,
  SettingsSecretValue,
  secretSetting,
  TrimmedString,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";

export const DEEPSEEK_DEFAULT_PROFILE = "acp";

export const DeepseekSettings = makeProviderSettingsSchema(
  {
    // Off by default like the other agent CLIs: users opt in from Settings.
    enabled: Schema.Boolean.pipe(
      Schema.withDecodingDefault(Effect.succeed(false)),
      Schema.annotateKey({ providerSettingsForm: { hidden: true } }),
    ),
    binaryPath: makeBinaryPathSetting("dsh").pipe(
      Schema.annotateKey({
        title: "Binary path",
        description: "Path to the DeepSeek Harness (dsh) executable.",
        providerSettingsForm: { placeholder: "dsh", clearWhenEmpty: "omit" },
      }),
    ),
    profile: TrimmedString.pipe(
      Schema.withDecodingDefault(Effect.succeed(DEEPSEEK_DEFAULT_PROFILE)),
      Schema.annotateKey({
        title: "Harness profile",
        description:
          "DeepSeek Harness profile that serves ACP. `dsh` ships it as `acp`; change it only for a custom profile.",
        providerSettingsForm: {
          placeholder: DEEPSEEK_DEFAULT_PROFILE,
          clearWhenEmpty: "omit",
        },
      }),
    ),
    apiKey: SettingsSecretValue.pipe(
      secretSetting,
      Schema.withDecodingDefault(Effect.succeed("")),
      Schema.annotateKey({
        title: "DeepSeek API key",
        description:
          "Optional. Passed to the harness as DEEPSEEK_API_KEY; without it the account signed in to DeepSeek Harness is used.",
        providerSettingsForm: {
          control: "password",
          placeholder: "Optional",
          clearWhenEmpty: "omit",
        },
      }),
    ),
    customModels: Schema.Array(CustomModelSetting).pipe(
      Schema.withDecodingDefault(Effect.succeed([])),
      Schema.annotateKey({ providerSettingsForm: { hidden: true } }),
    ),
  },
  {
    order: ["binaryPath", "profile", "apiKey"],
  },
);
export type DeepseekSettings = typeof DeepseekSettings.Type;
