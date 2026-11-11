import { expect, it } from "vite-plus/test";
import { render } from "../test/render";
import { useInterfaceLanguage, useTranslation } from "./i18n";

function LanguageControl() {
  const [language, setLanguage] = useInterfaceLanguage();
  const t = useTranslation();
  return (
    <button onClick={() => setLanguage(language === "en" ? "zh-CN" : "en")}>{t("Settings")}</button>
  );
}

it("switches the interface language immediately and remembers it after remount", async () => {
  localStorage.removeItem("t3code:interface-language:v1");
  try {
    {
      await using screen = await render(<LanguageControl />, { router: false }); // No routing is needed for the language control.
      await screen.getByRole("button", { name: "Settings" }).click();
      await expect.element(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
    }
    {
      await using screen = await render(<LanguageControl />, { router: false }); // Verify the saved preference on a fresh mount.
      await expect.element(screen.getByRole("button", { name: "设置" })).toBeInTheDocument();
      await screen.getByRole("button", { name: "设置" }).click();
      await expect.element(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
    }
  } finally {
    localStorage.removeItem("t3code:interface-language:v1");
  }
});
