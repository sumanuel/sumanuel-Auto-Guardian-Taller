function toDateOnly(value) {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null;
  }

  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

export function getTimestampMillis(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (value?.toMillis) {
    return value.toMillis();
  }

  if (value instanceof Date) {
    return value.getTime();
  }

  return 0;
}

export function normalizeDateRange(range) {
  const rawStart = toDateOnly(range?.start);
  const rawEnd = toDateOnly(range?.end);

  if (!rawStart || !rawEnd) {
    return {
      start: rawStart,
      end: rawEnd,
    };
  }

  const orderedStart = rawStart <= rawEnd ? rawStart : rawEnd;
  const orderedEnd = rawStart <= rawEnd ? rawEnd : rawStart;

  return {
    start: orderedStart,
    end: new Date(
      orderedEnd.getFullYear(),
      orderedEnd.getMonth(),
      orderedEnd.getDate(),
      23,
      59,
      59,
      999,
    ),
  };
}

export function createLastDaysRange(days = 30) {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - Math.max(0, days - 1));

  return normalizeDateRange({ start, end });
}

export function createTodayRange() {
  return createLastDaysRange(1);
}

export function createCurrentWeekRange() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  const weekDay = (end.getDay() + 6) % 7;
  start.setDate(end.getDate() - weekDay);

  return normalizeDateRange({ start, end });
}

export function createCurrentMonthRange() {
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(today.getFullYear(), today.getMonth(), 1);

  return normalizeDateRange({ start, end });
}

let sharedOperationalDateRange = createLastDaysRange(30);

export function getSharedOperationalDateRange() {
  return normalizeDateRange(sharedOperationalDateRange);
}

export function setSharedOperationalDateRange(range) {
  sharedOperationalDateRange = normalizeDateRange(range);
  return sharedOperationalDateRange;
}

export function isWithinDateRange(value, range) {
  const timestamp = getTimestampMillis(value);

  if (!timestamp) {
    return false;
  }

  const normalizedRange = normalizeDateRange(range);
  const startTimestamp = normalizedRange.start
    ? normalizedRange.start.getTime()
    : null;
  const endTimestamp = normalizedRange.end
    ? normalizedRange.end.getTime()
    : null;

  if (startTimestamp !== null && timestamp < startTimestamp) {
    return false;
  }

  if (endTimestamp !== null && timestamp > endTimestamp) {
    return false;
  }

  return true;
}

export function formatDateInput(value) {
  const resolvedDate = toDateOnly(value);

  if (!resolvedDate) {
    return "";
  }

  return `${resolvedDate.getFullYear()}-${String(
    resolvedDate.getMonth() + 1,
  ).padStart(2, "0")}-${String(resolvedDate.getDate()).padStart(2, "0")}`;
}

export function parseDateInput(value) {
  const normalizedValue = String(value || "").trim();

  if (!normalizedValue) {
    return null;
  }

  const match = normalizedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (!match) {
    return null;
  }

  const parsedDate = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );

  if (
    parsedDate.getFullYear() !== Number(match[1]) ||
    parsedDate.getMonth() !== Number(match[2]) - 1 ||
    parsedDate.getDate() !== Number(match[3])
  ) {
    return null;
  }

  return parsedDate;
}

function formatShortDate(value) {
  const resolvedDate = toDateOnly(value);

  if (!resolvedDate) {
    return "Sin fecha";
  }

  return resolvedDate.toLocaleDateString("es-VE");
}

export function formatDateRangeLabel(range) {
  const normalizedRange = normalizeDateRange(range);

  if (!normalizedRange.start || !normalizedRange.end) {
    return "Rango sin definir";
  }

  return `${formatShortDate(normalizedRange.start)} - ${formatShortDate(
    normalizedRange.end,
  )}`;
}