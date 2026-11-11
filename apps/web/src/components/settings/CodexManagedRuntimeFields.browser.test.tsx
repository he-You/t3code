import { EnvironmentId, ProviderInstanceId } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { CodexManagedRuntimeFields } from "./CodexSetupSection";

vi.mock("../../state/query", async (original) => ({
  ...(await original<typeof import("../../state/query")>()),
  useEnvironmentQuery: () => ({ data: { executablePath: "/opt/codex" }, error: null }),
}));

it("localizes Codex runtime labels while preserving the executable path", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(
      <CodexManagedRuntimeFields
        environmentId={EnvironmentId.make("local")}
        instanceId={ProviderInstanceId.make("codex")}
        provider={undefined}
      />,
    );
    await expect.element(screen.getByRole("heading", { name: "可执行文件路径" })).toBeVisible();
    await expect.element(screen.getByLabelText("Codex 可执行文件路径")).toHaveValue("/opt/codex");
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
