import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { MobileClientsUserProfilePage } from "./MobileClientsUserProfilePage";

vi.mock("../../cloud/managedRelayState", () => ({
  useManagedRelayDevices: () => ({
    accountId: "account",
    data: [],
    error: null,
    isPending: false,
    refresh: vi.fn(),
  }),
}));

it("shows the mobile client empty state in Chinese", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(<MobileClientsUserProfilePage />);
    await expect.element(screen.getByRole("heading", { name: "移动客户端" })).toBeVisible();
    await expect.element(screen.getByText("没有移动客户端")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "刷新" })).toBeVisible();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
