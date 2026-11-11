import type { InterfaceLanguage } from "../../i18n";
import type { RelayClientDeviceRecord } from "@t3tools/contracts/relay";

const mobileClientUpdatedAtFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const NOTIFICATION_PREFERENCES = [
  ["notifyOnApproval", "approvals"],
  ["notifyOnInput", "input requests"],
  ["notifyOnCompletion", "completions"],
  ["notifyOnFailure", "failures"],
] as const satisfies ReadonlyArray<
  readonly [keyof RelayClientDeviceRecord["notifications"], string]
>;

export function mobileClientPlatformLabel(device: RelayClientDeviceRecord): string {
  const platform =
    device.platform === "android"
      ? "Android"
      : device.iosMajorVersion === null
        ? "iOS"
        : `iOS ${device.iosMajorVersion}`;
  return `${platform}${device.appVersion ? ` · T3 Code ${device.appVersion}` : ""}`;
}

export function mobileClientNotificationDetail(
  device: RelayClientDeviceRecord,
  language: InterfaceLanguage = "en",
): string {
  if (!device.notifications.enabled) {
    return language === "zh-CN"
      ? "此设备已关闭推送通知。"
      : "Push notifications are disabled on this device.";
  }

  const enabledPreferences = NOTIFICATION_PREFERENCES.flatMap(([preference, label]) =>
    device.notifications[preference] ? [label] : [],
  );
  if (language === "zh-CN") {
    const labels: Record<string, string> = {
      approvals: "审批",
      "input requests": "输入请求",
      completions: "完成",
      failures: "失败",
    };
    return enabledPreferences.length > 0
      ? `已启用以下提醒：${enabledPreferences.map((label) => labels[label]).join("、")}。`
      : "推送通知已启用，但未选择提醒类型。";
  }
  return enabledPreferences.length > 0
    ? `Alerts enabled for ${enabledPreferences.join(", ")}.`
    : "Push notifications are enabled, but no alert types are selected.";
}

export function mobileClientUpdatedAtLabel(
  updatedAt: string,
  language: InterfaceLanguage = "en",
): string {
  const date = new Date(updatedAt);
  return Number.isNaN(date.getTime())
    ? language === "zh-CN"
      ? "更新时间不可用"
      : "Update time unavailable"
    : language === "zh-CN"
      ? `更新于 ${new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(date)}`
      : `Updated ${mobileClientUpdatedAtFormatter.format(date)}`;
}
