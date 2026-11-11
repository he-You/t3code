import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { PullRequestListEmptyState } from "./PullRequestListEmptyState";

it("shows Chinese search empty state while preserving the search query", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(
      <PullRequestListEmptyState
        query="feature/login"
        filtered={false}
        searching={false}
        hasProjects
        canLoadMore={false}
        loadingMore={false}
        refreshing={false}
        onClearQuery={vi.fn()}
        onLoadMore={vi.fn()}
        onRefresh={vi.fn()}
      />,
    );
    await expect.element(screen.getByText("没有与“feature/login”匹配的结果")).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "清除搜索" })).toBeInTheDocument();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
