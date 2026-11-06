import type { CalendarDayStatus } from '@exam-planner/shared-types';

export const calendarStatusLabels: Record<CalendarDayStatus, string> = {
  available: 'Libero',
  occupied: 'Occupato',
  weekend: 'Fine settimana',
  holiday: 'Festività',
  'outside-planning-window': 'Finestra chiusa',
};
