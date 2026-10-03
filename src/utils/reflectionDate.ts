/** 振り返りの日付を決めるタイムゾーン（アプリ全体の前提と同じ JST） */
export const REFLECTION_TIME_ZONE = "Asia/Tokyo";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: REFLECTION_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * 振り返りの日付（reflection_date）に使う「今日」を、日本時間（JST）で返す。
 *
 * `new Date().toISOString().split("T")[0]` は UTC の日付になるため、
 * JST の 0:00〜8:59 は前日になってしまう。アプリ全体の前提（リマインダー、
 * カレンダー、統計）は JST なので、保存する日付も JST でそろえる。
 *
 * @returns "YYYY-MM-DD"
 */
export const getTodayInJst = (now: Date = new Date()): string => {
  const parts = formatter.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
};
