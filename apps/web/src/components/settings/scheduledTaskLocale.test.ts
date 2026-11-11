import { describe, expect, it } from "vite-plus/test";
import * as Schema from "effect/Schema";
import { ScheduledTaskSchedule } from "@t3tools/contracts";
import { relativeLabel, scheduleLabel } from "./ScheduledTasksSettings";

const decodeSchedule = Schema.decodeUnknownSync(ScheduledTaskSchedule);

describe("scheduled task localization", () => {
  it("formats intervals and weekdays without changing the schedule", () => {
    const interval = { type: "interval" as const, everyMs: 120_000 };
    expect(scheduleLabel(interval, "zh-CN")).toBe("每 2 分钟");
    expect(scheduleLabel(interval, "en")).toBe("Every 2 min");
    expect(
      scheduleLabel(
        decodeSchedule({
          type: "fixed_time",
          timeOfDay: "09:30",
          weekdays: [1, 3],
        }),
        "zh-CN",
      ),
    ).toBe("周一、周三 09:30");
  });

  it("formats past and future relative times in the selected language", () => {
    const now = Date.parse("2026-01-01T12:00:00Z");
    expect(relativeLabel("2026-01-01T12:05:00Z", now, "zh-CN")).toBe("5 分钟后");
    expect(relativeLabel("2026-01-01T11:58:00Z", now, "zh-CN")).toBe("2 分钟前");
    expect(relativeLabel("2026-01-01T12:05:00Z", now, "en")).toBe("in 5m");
    expect(relativeLabel(null, now, "zh-CN")).toBe("未计划");
  });
});
