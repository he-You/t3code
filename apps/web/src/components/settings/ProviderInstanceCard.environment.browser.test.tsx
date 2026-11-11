import { userEvent } from "vite-plus/test/browser";
import { describe, expect, it, vi } from "vite-plus/test";

import { render } from "../../../test/render";
import { ProviderEnvironmentSection } from "./ProviderInstanceCard";

const savedSecret = {
  name: "FAKE_API_KEY",
  value: "",
  sensitive: true,
  valueRedacted: true,
} as const;

describe("ProviderEnvironmentSection saved secrets", () => {
  it("localizes variable controls without changing their names or stored-secret protection", async () => {
    localStorage.setItem("t3code:interface-language:v1", JSON.stringify("zh-CN"));
    try {
      const onChange = vi.fn();
      await using screen = await render(
        <ProviderEnvironmentSection environment={[savedSecret]} onChange={onChange} />,
      );
      await expect
        .element(screen.getByRole("textbox", { name: "环境变量名称 1" }))
        .toHaveValue("FAKE_API_KEY");
      await expect
        .element(screen.getByLabelText("环境变量值 1"))
        .toHaveAttribute("type", "password");
      await expect
        .element(screen.getByRole("button", { name: "将环境变量 FAKE_API_KEY 标记为敏感" }))
        .toBeDisabled();
      expect(onChange).not.toHaveBeenCalled();
    } finally {
      localStorage.removeItem("t3code:interface-language:v1");
    }
  });
  it("requires a replacement before renaming or unlocking a stored secret", async () => {
    const onChange = vi.fn();
    await using screen = await render(
      <ProviderEnvironmentSection environment={[savedSecret]} onChange={onChange} />,
    );
    const name = screen.getByRole("textbox", { name: "Environment variable name 1" });
    const value = screen.getByLabelText("Environment variable value 1");
    const lock = screen.getByRole("button", {
      name: "Mark environment variable FAKE_API_KEY as sensitive",
    });

    await expect.element(name).toBeDisabled();
    await expect.element(lock).toBeDisabled();
    await userEvent.fill(value, "unused-draft");
    await userEvent.clear(value);
    await userEvent.tab();
    expect(onChange).not.toHaveBeenCalled();
    await expect.element(name).toBeDisabled();
    await expect.element(lock).toBeDisabled();

    await userEvent.fill(value, "fake-replacement");
    await userEvent.tab();
    expect(onChange).toHaveBeenLastCalledWith([
      { ...savedSecret, value: "fake-replacement", valueRedacted: false },
    ]);
    await expect.element(name).toBeEnabled();
    await expect.element(lock).toBeEnabled();
    await userEvent.fill(name, "RENAMED_KEY");
    await userEvent.tab();
    await userEvent.click(
      screen.getByRole("button", { name: "Mark environment variable RENAMED_KEY as sensitive" }),
    );
    expect(onChange).toHaveBeenLastCalledWith([
      { name: "RENAMED_KEY", value: "fake-replacement", sensitive: false, valueRedacted: false },
    ]);
    await userEvent.click(
      screen.getByRole("button", { name: "Remove environment variable RENAMED_KEY" }),
    );
    expect(onChange).toHaveBeenLastCalledWith([]);
  });
});
