
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
};

export const getTodayStr = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const diffMinutes = (start: string, end: string): number => {
  const [sH, sM] = start.split(':').map(Number);
  const [eH, eM] = end.split(':').map(Number);
  return (eH * 60 + eM) - (sH * 60 + sM);
};

export const diffMinutesFromDate = (start: string, now: Date): number => {
  const [sH, sM] = start.split(':').map(Number);
  const startMinutes = sH * 60 + sM;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return Math.max(0, nowMinutes - startMinutes);
};

export const formatMinutesToDisplay = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};

export const isLate = (timeIn: string, officeStart: string): boolean => {
  return diffMinutes(officeStart, timeIn) > 0;
};
