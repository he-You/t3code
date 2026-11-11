import { describe, expect, it } from "vite-plus/test";
import { translate } from "./i18n";
import { localizeThreadMenu } from "./components/threadActionMenu.logic";
import { localizePullRequestFilterLabel } from "./components/pullRequest/PullRequestListFilters";
import { threadConfirmation } from "./threadConfirmation";

describe("interface translations", () => {
  it("defaults to English and translates core labels when Chinese is selected", () => {
    expect(translate("en", "Settings")).toBe("Settings");
    expect(translate("zh-CN", "Settings")).toBe("设置");
  });

  it("falls back to the original text for untranslated labels", () => {
    expect(translate("zh-CN", "An untranslated label")).toBe("An untranslated label");
  });
});

describe("expanded interface translations", () => {
  it("keeps thread titles unchanged and warns about permanent history deletion", () => {
    expect(threadConfirmation("zh-CN", "delete", "Alpha / 任务")).toBe(
      "删除会话“Alpha / 任务”？\n这将永久清除此会话的聊天记录。",
    );
    expect(threadConfirmation("en", "archive", "Alpha")).toBe('Archive thread "Alpha"?');
    expect(threadConfirmation("zh-CN", "delete-many", 2)).toContain("永久清除这些会话的聊天记录");
  });
  it("translates built-in pull request filter labels but preserves user project names", () => {
    expect(localizePullRequestFilterLabel("zh-CN", "Open", true)).toBe("开启中");
    expect(localizePullRequestFilterLabel("zh-CN", "Open", false)).toBe("Open");
    expect(localizePullRequestFilterLabel("en", "Open", true)).toBe("Open");
  });
  it("translates diff navigation and empty states", () => {
    expect(translate("zh-CN", "Uncommitted")).toBe("未提交");
    expect(translate("zh-CN", "No patch available for this selection.")).toBe(
      "此选择没有可用的补丁。",
    );
    expect(translate("en", "Uncommitted")).toBe("Uncommitted");
  });
  it("translates nested thread menus without translating branch names", () => {
    const items = [
      { id: "new-thread-on-branch", label: "New thread on main" },
      { id: "copy", label: "Copy", children: [{ id: "copy-path", label: "Path" }] },
    ] as const;
    expect(localizeThreadMenu(items, "zh-CN")).toEqual([
      { id: "new-thread-on-branch", label: "在 main 上新建会话" },
      { id: "copy", label: "复制", children: [{ id: "copy-path", label: "路径" }] },
    ]);
    expect(localizeThreadMenu(items, "en")).toEqual(items);
  });
  it("translates common composer actions while preserving English", () => {
    expect(translate("zh-CN", "Stop generation")).toBe("停止生成");
    expect(translate("zh-CN", "Next question")).toBe("下一个问题");
    expect(translate("en", "Stop generation")).toBe("Stop generation");
  });
  it("translates welcome, settings, and common workspace text", () => {
    expect(translate("zh-CN", "Welcome to T3 Code")).toBe("欢迎使用 T3 Code");
    expect(translate("zh-CN", "Project grouping")).toBe("项目分组");
    expect(translate("zh-CN", "What should we work on?")).toBe("接下来要做什么？");
    expect(translate("en", "Project grouping")).toBe("Project grouping");
  });
});
