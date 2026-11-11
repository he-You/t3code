import type { InterfaceLanguage } from "./i18n";

export function threadConfirmation(
  language: InterfaceLanguage,
  action: "archive" | "delete" | "unpin",
  title: string,
): string;
export function threadConfirmation(
  language: InterfaceLanguage,
  action: "delete-many",
  count: number,
): string;
export function threadConfirmation(
  language: InterfaceLanguage,
  action: "archive" | "delete" | "unpin" | "delete-many",
  value: string | number,
): string {
  if (language === "zh-CN") {
    if (action === "archive") return `归档会话“${value}”？`;
    if (action === "unpin") return `取消置顶会话“${value}”？\n此会话将从置顶区域移出。`;
    if (action === "delete-many") return `删除 ${value} 个会话？\n这将永久清除这些会话的聊天记录。`;
    return `删除会话“${value}”？\n这将永久清除此会话的聊天记录。`;
  }
  if (action === "archive") return `Archive thread "${value}"?`;
  if (action === "unpin")
    return `Unpin thread "${value}"?\nThis will move the thread out of your pinned section.`;
  if (action === "delete-many")
    return `Delete ${value} thread${value === 1 ? "" : "s"}?\nThis permanently clears conversation history for these threads.`;
  return `Delete thread "${value}"?\nThis permanently clears conversation history for this thread.`;
}
