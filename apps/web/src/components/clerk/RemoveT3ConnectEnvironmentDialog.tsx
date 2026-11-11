import { useInterfaceLanguage, useTranslation } from "~/i18n";
import { Discovery } from "@t3tools/client-runtime/relay";
import type { EnvironmentId } from "@t3tools/contracts";
import { useState } from "react";

import { useRelayEnvironmentDiscovery } from "../../state/environments";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { Button, InlineButton } from "../ui/button";
import { useT3ConnectAccountPage } from "./T3ConnectAccountPages";

export function RemoveT3ConnectEnvironmentDialog({
  environmentLabel,
  environmentId,
  onCancel,
  onConfirm,
}: {
  readonly environmentLabel: string | null;
  readonly environmentId: EnvironmentId | null;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
}) {
  const t = useTranslation();
  const [language] = useInterfaceLanguage();
  const accountPage = useT3ConnectAccountPage();
  const discovery = useRelayEnvironmentDiscovery();
  const registration = environmentId
    ? Discovery.relayEnvironmentRegistration(discovery, environmentId)
    : "unknown";
  const [shown, setShown] = useState({ label: environmentLabel, registration });
  if (
    environmentLabel !== null &&
    (environmentLabel !== shown.label || registration !== shown.registration)
  ) {
    setShown({ label: environmentLabel, registration });
  }
  const openAccountPage = accountPage.open;
  const accountPageLink = openAccountPage ? (
    <InlineButton
      onClick={() => {
        onCancel();
        openAccountPage();
      }}
    >
      {t("T3 Connect settings")}
    </InlineButton>
  ) : (
    t("T3 Connect settings")
  );

  return (
    <>
      <AlertDialog
        open={environmentLabel !== null}
        onOpenChange={(open) => {
          if (!open) onCancel();
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "zh-CN"
                ? `从此设备移除 ${shown.label}？`
                : `Remove ${shown.label} from this device?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("This forgets its pairing, credentials, and cached threads here.")}
            </AlertDialogDescription>
            <AlertDialogDescription>
              {shown.registration === "registered" ? (
                <>
                  {language === "zh-CN"
                    ? "它仍保留在你的 T3 Connect 账户中并占用主机空间。请在"
                    : "It stays on your T3 Connect account and keeps its host space. Deregister it in "}
                  {accountPageLink}
                  {language === "zh-CN" ? "中注销以释放空间。" : " to free it."}
                </>
              ) : shown.registration === "unregistered" ? (
                t("It's no longer on your T3 Connect account.")
              ) : (
                <>
                  {language === "zh-CN"
                    ? "这不会更改你的 T3 Connect 账户。如需在账户中注销，请使用"
                    : "This doesn't change your T3 Connect account. To deregister it there, use "}
                  {accountPageLink}
                  {language === "zh-CN" ? "。" : "."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="outline" />}>{t("Cancel")}</AlertDialogClose>
            <Button variant="destructive" onClick={onConfirm}>
              {t("Remove from this device")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
      {accountPage.portals}
    </>
  );
}
