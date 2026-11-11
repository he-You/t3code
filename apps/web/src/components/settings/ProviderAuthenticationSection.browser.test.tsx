import {
  EnvironmentId,
  ProviderDriverKind,
  ProviderInstanceId,
  type ServerProvider,
} from "@t3tools/contracts";
import { expect, it, vi } from "vite-plus/test";
import { render } from "../../../test/render";
import { ProviderAuthenticationSection } from "./ProviderAuthenticationSection";

vi.mock("../../state/query", async (original) => ({
  ...(await original<typeof import("../../state/query")>()),
  useEnvironmentQuery: () => ({ data: { phase: "idle", methods: [] }, error: null }),
}));
vi.mock("../../state/use-atom-command", async (original) => ({
  ...(await original<typeof import("../../state/use-atom-command")>()),
  useAtomCommand: () => vi.fn(),
}));

it("localizes provider sign-in while preserving the environment name", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  const provider: ServerProvider = {
    instanceId: ProviderInstanceId.make("custom"),
    driver: ProviderDriverKind.make("codex"),
    installed: true,
    enabled: true,
    version: null,
    status: "ready",
    auth: { status: "unauthenticated" },
    checkedAt: "2026-09-02T00:00:00.000Z",
    models: [],
    skills: [],
    slashCommands: [],
    setup: { canAuthenticate: true, canInstall: false },
  };
  try {
    await using screen = await render(
      <ProviderAuthenticationSection
        environmentId={EnvironmentId.make("local")}
        environmentLabel="My Mac"
        instanceId={provider.instanceId}
        provider={provider}
        readOnly={false}
      />,
    );
    await expect.element(screen.getByText("在 My Mac 上登录。")).toBeVisible();
    await expect.element(screen.getByRole("button", { name: "登录" })).toBeVisible();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
