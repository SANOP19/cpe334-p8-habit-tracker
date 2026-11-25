// Calendar dates for the activity log are Asia/Bangkok dates (F-04 §4, NFR-09), the same rule the
// server uses, whatever timezone the user's device is set to (Lab 6 KI-3, #61).
const bangkokDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Asia/Bangkok minus `daysAgo` days, as YYYY-MM-DD. */
export function bangkokDate(daysAgo = 0, now: Date = new Date()): string {
  const today = bangkokDay.format(now);
  if (daysAgo === 0) return today;
  const [y, m, d] = today.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - daysAgo)).toISOString().slice(0, 10);
}
