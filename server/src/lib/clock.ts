let mockedNow: Date | null = null;

export const clock = {
  now(): Date {
    return mockedNow ? new Date(mockedNow.getTime()) : new Date();
  },
  todayBangkok(): string {
    const d = clock.now();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  },
  setMock(d: Date | string | null) {
    mockedNow = d ? new Date(d) : null;
  },
  reset() {
    mockedNow = null;
  },
};
