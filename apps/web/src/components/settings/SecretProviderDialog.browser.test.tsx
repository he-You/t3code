import { EnvironmentId } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { act, render } from "../../../test/render";
import { SecretProviderDialog } from "./SecretProviderDialog";

vi.mock("../../hooks/useSettings", () => ({ useUpdateEnvironmentSettings: () => vi.fn() }));

it("localizes secret-provider setup and preserves the environment name", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(
      <SecretProviderDialog
        environmentId={EnvironmentId.make("local")}
        environmentLabel="My Mac"
        existingIds={new Set()}
        onClose={vi.fn()}
      />,
    );
    await expect.element(screen.getByText("添加 1Password 密钥提供商")).toBeInTheDocument();
    await expect.element(screen.getByText(/My Mac 上的服务提供商变量/)).toBeInTheDocument();
    await expect.element(screen.getByLabelText("账户")).toBeInTheDocument();
    await act(() =>
      document.querySelector<HTMLFormElement>("#secret-provider-form")!.requestSubmit(),
    );
    await expect.element(screen.getByText("请输入名称。")).toBeInTheDocument();
    await expect.element(screen.getByText("请输入 1Password 账户。")).toBeInTheDocument();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
