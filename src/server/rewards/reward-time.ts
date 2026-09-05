const ISTANBUL_OFFSET = "+03:00";
const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

interface DateWindow {
    end: Date;
    start: Date;
}

interface IstanbulDateParts {
    day: number;
    month: number;
    year: number;
}

const formatter = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: ISTANBUL_TIME_ZONE,
    year: "numeric",
});

function localDateParts(date: Date): IstanbulDateParts {
    const parts = Object.fromEntries(
        formatter.formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number(part.value)]),
    );
    return { day: parts.day, month: parts.month, year: parts.year };
}

function addLocalDays(parts: IstanbulDateParts, days: number): IstanbulDateParts {
    const result = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
    return {
        day: result.getUTCDate(),
        month: result.getUTCMonth() + 1,
        year: result.getUTCFullYear(),
    };
}

function localMidnight(parts: IstanbulDateParts): Date {
    const date = `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
    return new Date(`${date}T00:00:00${ISTANBUL_OFFSET}`);
}

export function getIstanbulDayWindow(now: Date): DateWindow {
    const startParts = localDateParts(now);
    return {
        end: localMidnight(addLocalDays(startParts, 1)),
        start: localMidnight(startParts),
    };
}

export function getIstanbulWeekWindow(now: Date): DateWindow {
    const current = localDateParts(now);
    const utcDate = new Date(Date.UTC(current.year, current.month - 1, current.day));
    const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;
    const startParts = addLocalDays(current, -daysSinceMonday);
    return {
        end: localMidnight(addLocalDays(startParts, 7)),
        start: localMidnight(startParts),
    };
}

export function subtractDays(date: Date, days: number): Date {
    return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}
