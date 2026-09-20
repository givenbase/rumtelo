/**
 * ISO week key → Monday..Sunday calendar range, as ISO dates.
 * Inverse of `currentWeek()` in common/utils/period.util.
 */
export function weekRange(week: string): { from: string; to: string } {
    const [yearPart, weekPart] = week.split('-W') as [string, string];
    const year = Number(yearPart);
    const isoWeek = Number(weekPart);

    // ISO 8601: week 1 contains 4 January. Walk back to that week's Monday.
    const fourthOfJanuary = new Date(Date.UTC(year, 0, 4));
    const weekdayOfFourth = fourthOfJanuary.getUTCDay() || 7;
    const mondayOfWeekOne = new Date(fourthOfJanuary);
    mondayOfWeekOne.setUTCDate(fourthOfJanuary.getUTCDate() - (weekdayOfFourth - 1));

    const monday = new Date(mondayOfWeekOne);
    monday.setUTCDate(mondayOfWeekOne.getUTCDate() + (isoWeek - 1) * 7);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const isoDate = (date: Date) => date.toISOString().slice(0, 10);
    return { from: isoDate(monday), to: isoDate(sunday) };
}
