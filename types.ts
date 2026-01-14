
export interface Task {
  id: string;
  title: string;
  description?: string;
  startTime?: string; // HH:mm (Original Estimate Start)
  endTime?: string;   // HH:mm (Original Estimate End)
  duration: number;   // Estimated Minutes
  actualDuration: number; // Actual Incurred Minutes
  status: 'pending' | 'completed';
  timerStartedAt?: number; // Timestamp for tracking active work
  createdAt: number;
}

export enum AttendanceStatus {
  PRESENT = 'Present',
  LATE = 'Late',
  HALFDAY = 'Half Day',
  ABSENT = 'Absent',
  INCOMPLETE = 'Incomplete'
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  timeIn?: string; // HH:mm
  timeOut?: string; // HH:mm
  tasks: Task[];
}

export interface AppState {
  isAuthenticated: boolean;
  logs: Record<string, DayLog>; // Key: date string
  config: {
    officeStartTime: string; // "09:00"
    targetWorkingHours: number; // 8
    userName: string;
    systemPassword: string; // Stored locally for demo
  };
}
