import { ProviderDriverKind } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { providerClients } from "./providerDriverMeta";
import { ProviderSettingsForm } from "./ProviderSettingsForm";

it("localizes local ACP controls while preserving executable and arguments", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    const definition = providerClients.get(ProviderDriverKind.make("acpRegistry"))!;
    await using screen = await render(
      <ProviderSettingsForm
        definition={definition}
        value={{ source: "local", commandPath: "/opt/my-agent", commandArgs: ["--project=demo"] }}
        idPrefix="test"
        variant="settings"
        onChange={vi.fn()}
      />,
    );
    await expect.element(screen.getByLabelText("可执行文件")).toHaveValue("/opt/my-agent");
    await expect.element(screen.getByLabelText("参数 1")).toHaveValue("--project=demo");
    await expect.element(screen.getByRole("button", { name: "添加参数" })).toBeVisible();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
