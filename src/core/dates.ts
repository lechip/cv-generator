const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

export function formatMonth(value?: string): string {
  if (!value) return "Present";
  const match = /^(\d{4})(?:-(\d{2}))?/.exec(value);
  if (!match) return value;
  if (!match[2]) return match[1];
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return monthFormatter.format(date);
}

export function formatRange(startDate?: string, endDate?: string): string {
  if (!startDate) return "";
  return `${formatMonth(startDate)} - ${endDate ? formatMonth(endDate) : "Present"}`;
}
