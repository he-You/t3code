import { expect, it } from "vite-plus/test";
import { render } from "../../test/render";
import { NewProjectSummary } from "./CommandPaletteAddProject";

it("localizes project creation guidance while keeping the project name and path", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(
      <NewProjectSummary
        name="Alpha"
        pathPreview="/work/Alpha"
        projectsRoot="/work"
        environmentLabel="Mac"
      />,
    );
    await expect.element(screen.getByText("Alpha")).toBeInTheDocument();
    await expect.element(screen.getByText("将在 Mac 上创建 /work/Alpha")).toBeInTheDocument();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
