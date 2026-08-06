const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 24 * 60 * 60 * 1000;
const EXAM_DATE_KEY = "2027-11-18";

export const EXAM_TARGET_MS = Date.parse("2027-11-17T15:00:00.000Z");

function toDate(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new TypeError("유효한 날짜가 필요합니다.");
  }

  return date;
}

function getKstDateKey(value) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: KST_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    })
      .formatToParts(toDate(value))
      .map(({ type, value: partValue }) => [type, partValue])
  );

  return `${parts.year}-${parts.month}-${parts.day}`;
}

function getUtcMidnightMs(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

function getBeforeExamDayDifference(dateKey) {
  return Math.round((getUtcMidnightMs(EXAM_DATE_KEY) - getUtcMidnightMs(dateKey)) / DAY_MS);
}

function getZeroRemaining() {
  return {
    totalSeconds: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  };
}

function getRemaining(totalSeconds) {
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    totalSeconds,
    days,
    hours,
    minutes,
    seconds
  };
}

export function formatRemaining(remaining) {
  return `${remaining.days}일 ${String(remaining.hours).padStart(2, "0")}시간 ${String(remaining.minutes).padStart(2, "0")}분 ${String(remaining.seconds).padStart(2, "0")}초`;
}

export function getCountdownState(now = Date.now()) {
  const currentDate = toDate(now);
  const currentMs = currentDate.getTime();
  const currentDateKey = getKstDateKey(currentDate);

  if (currentDateKey > EXAM_DATE_KEY) {
    return {
      status: "finished",
      ddayLabel: null,
      remaining: null,
      message: "시험이 종료되었습니다"
    };
  }

  if (currentDateKey === EXAM_DATE_KEY) {
    return {
      status: "exam-day",
      ddayLabel: "D-Day",
      remaining: getZeroRemaining(),
      message: "오늘 시험입니다"
    };
  }

  const totalSeconds = Math.max(0, Math.ceil((EXAM_TARGET_MS - currentMs) / 1000));

  return {
    status: "before",
    ddayLabel: `D-${getBeforeExamDayDifference(currentDateKey)}`,
    remaining: getRemaining(totalSeconds),
    message: "수능까지"
  };
}
