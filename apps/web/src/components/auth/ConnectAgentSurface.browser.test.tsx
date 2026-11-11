import { expect, it } from "vite-plus/test";
import { render } from "../../../test/render";
import { RadioGroup } from "../ui/radio-group";
import { AccessOption } from "./ConnectAgentSurface";

it("localizes access levels and their security descriptions", async () => {
  localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
  try {
    await using screen = await render(
      <RadioGroup value="read-only">
        <AccessOption access="read-only" selected disabledReason={undefined} />
        <AccessOption access="full-access" selected={false} disabledReason={undefined} />
      </RadioGroup>,
    );
    await expect.element(screen.getByText("只读")).toBeInTheDocument();
    await expect
      .element(screen.getByText("读取项目和会话；不能启动、发送消息或更改任何内容。"))
      .toBeInTheDocument();
    await expect.element(screen.getByText("允许执行命令和编辑而无需提示。")).toBeInTheDocument();
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
