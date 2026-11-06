/** @jest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { AvailabilityCalendar } from './availability-calendar';

describe('Date del calendario docente', () => {
  afterEach(cleanup);

  it.each([
    ['2027-01-14', 'giovedì 14 gennaio 2027'],
    ['2027-03-29', 'lunedì 29 marzo 2027'],
    ['2028-02-29', 'martedì 29 febbraio 2028'],
  ])('mostra %s in italiano e conserva la data originale alla selezione', (date, label) => {
    const onSelect = jest.fn();
    render(
      <AvailabilityCalendar
        days={[{
          date,
          status: 'available',
          isSelectable: true,
          isPlanningOpen: true,
          appointments: [],
        }]}
        selectedDate={date}
        onSelect={onSelect}
      />
    );

    const button = screen.getByRole('button');
    expect(screen.getByText(label).getAttribute('datetime')).toBe(date);
    expect(button.getAttribute('aria-pressed')).toBe('true');

    fireEvent.click(button);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(date);
  });
});
