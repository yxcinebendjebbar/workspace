import { describe, expect, it } from "vitest";
import { since } from "./time";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe("since", () => {
  it("calls anything under a minute now", () => {
    expect(since(0, 30 * SECOND)).toBe("just now");
    expect(since(0, 44 * SECOND)).toBe("just now");
  });

  it("counts minutes, then hours, then days", () => {
    expect(since(0, MINUTE)).toBe("1 minute ago");
    expect(since(0, 2 * MINUTE)).toBe("2 minutes ago");
    expect(since(0, HOUR)).toBe("1 hour ago");
    expect(since(0, 7 * HOUR)).toBe("7 hours ago");
    expect(since(0, DAY)).toBe("1 day ago");
    expect(since(0, 5 * DAY)).toBe("5 days ago");
  });

  it("keeps each unit for as long as it fits", () => {
    expect(since(0, 59 * MINUTE)).toBe("59 minutes ago");
    expect(since(0, 23 * HOUR)).toBe("23 hours ago");
    expect(since(0, 29 * DAY)).toBe("29 days ago");
  });

  it("shows the date once a day count stops being useful", () => {
    expect(since(0, 60 * DAY)).not.toContain("ago");
  });

  it("never reports the future, whatever the clock says", () => {
    expect(since(5 * SECOND, 0)).toBe("just now");
  });
});
