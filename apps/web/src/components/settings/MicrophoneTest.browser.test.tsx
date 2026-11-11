import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { MicrophoneTest } from "./MicrophoneTest";

it("localizes the microphone test and its unavailable state", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  vi.stubGlobal("AudioWorkletNode", undefined);
  try {
    await using screen = await render(<MicrophoneTest microphoneId="" />);
    await screen.getByRole("button", { name: "测试麦克风" }).click();
    await expect.element(screen.getByRole("status")).toHaveTextContent("语音输入失败");
    await expect.element(screen.getByRole("button", { name: "重新录制" })).toBeVisible();
  } finally {
    vi.unstubAllGlobals();
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
