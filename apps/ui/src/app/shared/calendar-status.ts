import type { CalendarAvailabilityDay, CalendarDayStatus } from '@exam-planner/shared-types';

export const calendarStatusLabels: Record<CalendarDayStatus, string> = {
  available: 'Libero',
  occupied: 'Occupato',
  weekend: 'Fine settimana',
  holiday: 'Festività',
  'outside-planning-window': 'Finestra chiusa',
};

const closedPlanningMessage = 'La finestra di pianificazione è chiusa. Puoi consultare gli appelli, ma non inserirli, modificarli o eliminarli.';

const calendarStatusDescriptions: Record<CalendarDayStatus, string> = {
  available: 'Questa data è disponibile per inserire un appello.',
  occupied: 'Questa data risulta già occupata.',
  weekend: 'Questa data cade nel fine settimana: non è possibile pianificare appelli.',
  holiday: 'Questa data è una festività esclusa dalla sessione: non è possibile pianificare appelli.',
  'outside-planning-window': closedPlanningMessage,
};

export function getCalendarDayMessage(day: CalendarAvailabilityDay, teacherId: number) {
  const ownCount = day.appointments.filter((appointment) => appointment.teacherId === teacherId).length;
  const otherCount = day.appointments.length - ownCount;
  const ownMessage = ownCount === 1
    ? 'Il tuo appello è inserito in questa data.'
    : 'I tuoi appelli sono inseriti in questa data.';
  let message = calendarStatusDescriptions[day.status];

  if (day.status === 'occupied') {
    if (ownCount > 0 && otherCount > 0) {
      message = 'In questa data sono presenti appelli tuoi e di altri docenti.';
    } else if (ownCount > 0) {
      message = ownMessage;
    } else if (otherCount === 1) {
      message = 'In questa data è già presente un appello di un altro docente.';
    } else if (otherCount > 1) {
      message = 'In questa data sono già presenti appelli di altri docenti.';
    }
  } else if (ownCount > 0) {
    message = `${ownMessage} ${message}`;
  }

  if (!day.isPlanningOpen && day.status !== 'outside-planning-window') {
    message = day.status === 'available'
      ? closedPlanningMessage
      : `${message} ${closedPlanningMessage}`;
  }

  return message;
}

export function getCalendarDateBlockReason(day: CalendarAvailabilityDay | undefined): string | undefined {
  if (!day) {
    return 'Seleziona una data nel calendario.';
  }
  if (!day.isPlanningOpen || day.status === 'outside-planning-window') {
    return 'La finestra di pianificazione è chiusa.';
  }
  if (day.status === 'weekend') {
    return 'La data selezionata cade nel fine settimana.';
  }
  if (day.status === 'holiday') {
    return 'La data selezionata è una festività esclusa dalla sessione.';
  }
  return undefined;
}

export function isCalendarDayAvailable(day: CalendarAvailabilityDay) {
  return day.isPlanningOpen
    && day.isSelectable
    && day.status === 'available'
    && day.appointments.length === 0;
}
