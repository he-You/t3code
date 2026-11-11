import { useInterfaceLanguage, useTranslation, type InterfaceLanguage } from "~/i18n";
import type { EnvironmentSpeechStatus } from "@t3tools/contracts";
import { effectiveSpeechLanguage } from "@t3tools/shared/speech";
import { updateClientSettings, useClientSettings } from "../../hooks/useSettings";
import { Select, SelectItem, SelectPopup, SelectTrigger, SelectValue } from "../ui/select";

const languageNames = {
  en: new Intl.DisplayNames(["en"], { type: "language" }),
  "zh-CN": new Intl.DisplayNames(["zh-CN"], { type: "language" }),
};
export const languageLabel = (code: string, language: InterfaceLanguage = "en") =>
  languageNames[language].of(code) ?? code;

type ModelLanguages = Pick<
  Extract<EnvironmentSpeechStatus, { supported: true }>,
  "languages" | "supportsLanguageDetection"
>;

export function SpeechLanguageSelect({ model }: { readonly model: ModelLanguages | null }) {
  const t = useTranslation();
  const [language] = useInterfaceLanguage();
  const preference = useClientSettings((settings) => settings.speechLanguage);
  const languages = model?.languages ?? [];
  const resolved = model
    ? effectiveSpeechLanguage(
        { languages, supportsLanguageDetection: model.supportsLanguageDetection ?? false },
        preference,
      )
    : preference;
  const effectiveLabel = resolved === "auto" ? t("Auto-detect") : languageLabel(resolved, language);
  const unavailable =
    preference !== "auto" && preference !== resolved
      ? language === "zh-CN"
        ? `${languageLabel(preference, language)}不可用`
        : `${languageLabel(preference)} unavailable`
      : null;
  const label = unavailable
    ? language === "zh-CN"
      ? `${effectiveLabel}（${unavailable}）`
      : `${effectiveLabel} (${unavailable})`
    : preference === "auto" && resolved !== "auto"
      ? language === "zh-CN"
        ? `自动（${effectiveLabel}）`
        : `Auto (${effectiveLabel})`
      : effectiveLabel;
  return (
    <Select
      value={preference}
      disabled={!model}
      onValueChange={(value) => {
        if (value) void updateClientSettings({ speechLanguage: value });
      }}
    >
      <SelectTrigger size="sm" aria-label={t("Transcription language")} className="max-w-64">
        <SelectValue>{label}</SelectValue>
      </SelectTrigger>
      <SelectPopup align="end" alignItemWithTrigger={false}>
        <SelectItem value="auto">{t("Auto")}</SelectItem>
        {unavailable ? (
          <SelectItem value={preference} disabled>
            {unavailable}
          </SelectItem>
        ) : null}
        {languages
          .toSorted((left, right) =>
            languageLabel(left, language).localeCompare(languageLabel(right, language), language),
          )
          .map((code) => (
            <SelectItem key={code} value={code}>
              {languageLabel(code, language)}
            </SelectItem>
          ))}
      </SelectPopup>
    </Select>
  );
}
