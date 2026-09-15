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
