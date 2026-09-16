// True once fewer than `lockDays` days remain before `startDate` (both
// compared as local calendar dates, time-of-day ignored).
export function isWithinChangeLockWindow(
  startDate: string,
  lockDays = 7,
): boolean {
  const cutoff = new Date(`${startDate}T00:00:00`);
  cutoff.setDate(cutoff.getDate() - lockDays);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime() >= cutoff.getTime();
}

export function formatDateRange(start: string, end: string | null) {
  const startDate = new Date(start);
  const startText = startDate.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
  if (!end || end === start) return startText;
  const endDate = new Date(end);
  const endText = endDate.toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });
  return `${startText} - ${endText}`;
}
