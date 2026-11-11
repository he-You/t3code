import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { ProjectContentSearchDialog } from "./ProjectContentSearchDialog";

vi.mock("~/hooks/useActiveProjectTarget", () => ({ useActiveProjectTarget: () => null }));

it("localizes the project search empty state", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(<ProjectContentSearchDialog onOpenChange={vi.fn()} />);
    await expect.element(screen.getByText("打开项目以搜索其文件。")).toBeInTheDocument();
    await expect.element(screen.getByPlaceholder("搜索项目内容…")).toBeDisabled();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
