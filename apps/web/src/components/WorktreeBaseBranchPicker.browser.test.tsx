import { EnvironmentId, type VcsRef } from "@t3tools/contracts";
import { describe, expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";

const mocks = vi.hoisted(() => ({ resolvedQueries: new Set<string>() }));

const REFS: VcsRef[] = ["develop", "main", "origin/main", "origin/feature/main-nav"].map(
  (name) => ({ name, current: false, isDefault: false, worktreePath: null }),
);

// Like the real hook, a query has no refs until the server answers it.
vi.mock(import("../state/queries"), async (original) => ({
  ...(await original()),
  usePaginatedBranches: (target) => {
    const query = target.query ?? "";
    const resolved = mocks.resolvedQueries.has(query);
    const refs = resolved ? REFS.filter((ref) => ref.name.includes(query)) : [];
    return {
      data: resolved
        ? { refs, isRepo: true, hasPrimaryRemote: true, nextCursor: null, totalCount: refs.length }
        : null,
      refs,
      error: null,
      isPending: !resolved,
      isFetchingNextPage: false,
      refresh: () => {},
      loadNext: () => {},
    };
  },
}));

import "~/index.css";
import { render } from "../../test/render";
import { WorktreeBaseBranchPicker } from "./WorktreeBaseBranchPicker";

function setup() {
  mocks.resolvedQueries = new Set([""]);
}

describe("WorktreeBaseBranchPicker", () => {
  it("shows Chinese controls without translating branch names", async () => {
    setup();
    localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
    try {
      await using screen = await render(
        <WorktreeBaseBranchPicker
          environmentId={EnvironmentId.make("primary")}
          cwd="/repo"
          value=""
          onValueChange={() => {}}
          startFromOrigin={false}
          onStartFromOriginChange={() => {}}
        />,
      );
      await expect.element(screen.getByText("选择引用")).toBeVisible();
      await userEvent.click(screen.getByRole("combobox"));
      await expect.element(page.getByPlaceholder("搜索引用…")).toBeVisible();
      await expect
        .element(page.getByRole("switch", { name: "从远程分支创建工作树" }))
        .toBeVisible();
      await expect.element(page.getByRole("option", { name: /origin\/\s*main/ })).toBeVisible();
    } finally {
      localStorage.removeItem("t3code:interface-language:v1");
    }
  });

  it.each([
    { keys: "{Enter}", selected: "main" },
    { keys: "{ArrowDown}{Enter}", selected: "origin/main" },
  ])(
    "$keys selects $selected when each keystroke's results arrive before the next",
    async ({ keys, selected }) => {
      setup();
      const onValueChange = vi.fn();
      const picker = () => (
        <WorktreeBaseBranchPicker
          environmentId={EnvironmentId.make("primary")}
          cwd="/repo"
          value=""
          onValueChange={onValueChange}
          startFromOrigin={false}
          onStartFromOriginChange={() => {}}
        />
      );
      await using screen = await render(picker());

      await userEvent.click(screen.getByRole("combobox"));
      let query = "";
      for (const char of "main") {
        await userEvent.type(page.getByPlaceholder("Search refs..."), char);
        query += char;
        mocks.resolvedQueries.add(query);
        await screen.rerender(picker());
      }

      await expect
        .element(page.getByRole("option", { name: "main", exact: true }))
        .toHaveAttribute("data-highlighted");
      await userEvent.keyboard(keys);
      expect(onValueChange).toHaveBeenCalledExactlyOnceWith(selected);
    },
  );
});
