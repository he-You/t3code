import { EnvironmentId } from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { DeviceHostEditor } from "./DeviceHostEditor";

vi.mock("./useHostConnectionChecks", () => ({
  useHostConnectionChecks: () => ({ checks: {}, testConnection: vi.fn() }),
}));

it("localizes host configuration while preserving user-supplied names and SSH targets", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(
      <DeviceHostEditor
        host={{ kind: "ssh", id: "mac", label: "My Mac", target: "user@host" }}
        isNew
        targets={[
          { environmentId: EnvironmentId.make("local"), label: "Local Mac", connected: true },
        ]}
        busy={false}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    await expect.element(screen.getByText("添加设备主机")).toBeInTheDocument();
    await expect
      .element(screen.getByText("从 Local Mac 连接。将跳过同一台机器上的主机。"))
      .toBeInTheDocument();
    expect(document.querySelector<HTMLInputElement>('input[value="My Mac"]')?.value).toBe("My Mac");
    expect(document.querySelector<HTMLInputElement>('input[value="user@host"]')?.value).toBe(
      "user@host",
    );
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
