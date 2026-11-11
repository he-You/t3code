import { expect, it } from "vite-plus/test";
import { render } from "../../../test/render";
import { PanelAnimationsPreview } from "./PanelAnimationsPreview";

it("localizes the animation preview control while preserving its duration", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(<PanelAnimationsPreview durationMs={250} />);
    const button = screen.getByRole("button", { name: "重新播放面板动画预览" });
    await expect.element(button).toBeVisible();
    expect((button.element() as HTMLElement).style.getPropertyValue("--preview-duration")).toBe(
      "250ms",
    );
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
