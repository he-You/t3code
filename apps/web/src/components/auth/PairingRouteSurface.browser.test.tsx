import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { PairingPendingSurface, PairingRouteSurface } from "./PairingRouteSurface";

it("localizes pairing instructions without changing the credential", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(<PairingPendingSurface />);
    await expect.element(screen.getByText("正在与此环境配对")).toBeInTheDocument();
    await screen.rerender(
      <PairingRouteSurface
        auth={{
          policy: "loopback-browser",
          bootstrapMethods: ["one-time-token"],
          sessionMethods: ["browser-session-cookie"],
          sessionCookieName: "t3_session",
        }}
        onAuthenticated={vi.fn()}
      />,
    );
    await expect.element(screen.getByText("与此环境配对")).toBeInTheDocument();
    await expect.element(screen.getByPlaceholder("粘贴一次性令牌或配对密钥")).toBeInTheDocument();
    await expect.element(screen.getByRole("button", { name: "继续" })).toBeInTheDocument();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
