import type { EnvironmentSpeechModel } from "@t3tools/contracts";
import { expect, it } from "vite-plus/test";
import { render } from "../../../test/render";
import { ModelBenchmarks } from "./SpeechModelComparison";

it("localizes benchmark language and unavailable scores without changing model facts", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  const model: EnvironmentSpeechModel = {
    id: "tiny",
    name: "Tiny",
    description: "",
    size: 100,
    languages: ["en"],
    accuracy: 1,
    speed: 1,
    recommended: false,
    supportsStreaming: false,
    supportsTranslation: false,
    supportsLanguageDetection: false,
    active: true,
    state: "installed",
    benchmark: { accuracy: {}, secondsPer30s: null },
  };
  try {
    await using screen = await render(
      <ModelBenchmarks model={model} languages={["en"]} facts={["100 MB"]} />,
    );
    expect(screen.container.textContent).toContain("英语");
    expect(screen.container.textContent).toContain("未测试");
    await expect.element(screen.getByText("100 MB")).toBeInTheDocument();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
