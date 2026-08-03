export type DateRange = {
  from?: Date;
  to?: Date;
};

export function getDateRange(range?: string | null): DateRange {
  if (!range || range === 'all') {
    return {};
  }

  const now = new Date();

  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  switch (range) {
    case 'today':
      return {
        from: startOfToday,
        to: now,
      };

    case 'yesterday': {
      const yesterdayStart = new Date(startOfToday);

      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      return {
        from: yesterdayStart,
        to: startOfToday,
      };
    }

    case '7d': {
      const sevenDaysAgo = new Date(startOfToday);

      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      return {
        from: sevenDaysAgo,
        to: now,
      };
    }

    case '30d': {
      const thirtyDaysAgo = new Date(startOfToday);

      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      return {
        from: thirtyDaysAgo,
        to: now,
      };
    }

    default:
      return {};
  }
}

export function isDateInRange(
  date: Date,
  range?: string | null
): boolean {
  const { from, to } = getDateRange(range);

  if (from && date.getTime() < from.getTime()) {
    return false;
  }

  if (to && date.getTime() > to.getTime()) {
    return false;
  }

  return true;
}
