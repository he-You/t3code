import { expect, it } from "vite-plus/test";
import { render } from "../../test/render";
import { PreviousWorktreeItemContent } from "./PreviousWorktreeItemContent";

it("translates the workspace label but preserves the branch name", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(<PreviousWorktreeItemContent branch="feature/my-work" />);
    await expect.element(screen.getByText("上一个工作树")).toBeInTheDocument();
    expect(document.body.textContent).toContain("feature/my-work");
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
