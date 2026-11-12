import { ProviderDriverKind } from "@t3tools/contracts";
import { defineProviderClient } from "@t3tools/provider-core/client";

import { ZcodeSettings } from "./settings.ts";

// ZCode's mark from the header of https://zcode.z.ai.
const ZCODE_MARK_TOP =
  "M134.4 0.130152L116.48 25.6022C113.665 29.5699 109.054 32.0019 104.064 32.0019H6.3999V0C6.3999 0.130149 134.4 0.130152 134.4 0.130152Z";

const ZCODE_MARK_MIDDLE = "M256 0.130127L102.401 217.732H0L153.599 0.130127H256Z";

const ZCODE_MARK_BOTTOM =
  "M121.601 217.732L139.65 192.134C142.465 188.166 147.076 185.734 152.067 185.734H249.604V217.736H121.601V217.732Z";

export const zcodeClient = defineProviderClient({
  driverKind: ProviderDriverKind.make("zcode"),
  label: "ZCode",
  settingsSchema: ZcodeSettings,
  icon: {
    viewBox: "0 0 256 218",
    fill: { light: "#0A0A0A", dark: "#FFFFFF" },
    paths: [{ d: ZCODE_MARK_TOP }, { d: ZCODE_MARK_MIDDLE }, { d: ZCODE_MARK_BOTTOM }],
  },
});
