import { EnvironmentId, ProjectId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";
import { planProjectRemoval } from "./projectRemoval";

const member = {
  id: ProjectId.make("p"),
  environmentId: EnvironmentId.make("e"),
  title: "Project Alpha",
  workspaceRoot: "/work/Alpha",
  environmentLabel: "Mac",
};

describe("project removal messages", () => {
  it("keeps the original path and accurately explains thread and file deletion in Chinese", () => {
    const result = planProjectRemoval({
      members: [member],
      groupMemberCount: 1,
      hasOtherMembers: false,
      displayName: "Project Alpha",
      threads: [],
      unloadedThreadCount: 2,
      locale: "zh-CN",
    });
    expect(result.confirmationMessage).toContain("项目“Project Alpha”并删除其中的 2 个会话");
    expect(result.confirmationMessage).toContain("路径：/work/Alpha");
    expect(result.confirmationMessage).toContain("服务提供商的会话将保留");
    expect(result.confirmationMessage).toContain("不会删除磁盘上的文件");
    expect(result.confirmationMessage).toContain("此操作无法撤销");
  });
  it("retains the English default for other clients", () => {
    const result = planProjectRemoval({
      members: [member],
      groupMemberCount: 1,
      hasOtherMembers: false,
      displayName: "Project Alpha",
      threads: [],
    });
    expect(result.confirmationMessage).toContain('Remove project "Project Alpha"?');
    expect(result.confirmationMessage).toContain("This action cannot be undone.");
  });
});
