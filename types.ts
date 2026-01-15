
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
  LEAVE = 'Leave',
  INCOMPLETE = 'Incomplete'
}

export type ThemeType = 'executive' | 'cyberpunk' | 'emerald' | 'crimson' | 'nordic' | 'light';

export interface DayLog {
  date: string; // YYYY-MM-DD
  timeIn?: string; // HH:mm
  timeOut?: string; // HH:mm
  status?: AttendanceStatus;
  tasks: Task[];
}

export interface UserProfile {
  id: string;
  name: string;
  password: string;
  role: 'admin' | 'user';
  createdAt: number;
}

export interface AppState {
  isAuthenticated: boolean;
  currentUser?: UserProfile;
  theme: ThemeType;
  rememberMe: boolean;
  // userLogs[userId][date] = DayLog
  userLogs: Record<string, Record<string, DayLog>>;
  config: {
    officeStartTime: string; // "09:00"
    targetWorkingHours: number; // 8
    sheetUrl?: string; // Google Apps Script Web App URL
    users: UserProfile[]; // Master user list managed by admin
  };
}
