import { expect, it } from "vite-plus/test";
import { page } from "vite-plus/test/browser";
import { act, render } from "../../test/render";
import { CustomSnoozeDialogHost, requestCustomSnooze } from "./CustomSnoozeDialog";

it("allows choosing a duration in Chinese and cancels without scheduling", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using _screen = await render(<CustomSnoozeDialogHost />);
    let result!: ReturnType<typeof requestCustomSnooze>;
    await act(() => {
      result = requestCustomSnooze();
    });
    await expect.element(page.getByRole("heading", { name: "自定义稍后提醒" })).toBeVisible();
    await page.getByRole("button", { name: "持续时间" }).click();
    await expect.element(page.getByText("提醒时间间隔")).toBeVisible();
    const cancel = [...document.querySelectorAll("button")].find(
      (button) => button.textContent === "取消",
    );
    expect(cancel).toBeDefined();
    await act(() => cancel!.click());
    expect(await result).toBeNull();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
