import { ReactNode } from 'react';

export type SortOption = {
  value: string;
  label: string;
};

type ListToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  sort: string;
  onSortChange: (value: string) => void;
  sortOptions: SortOption[];
  children?: ReactNode;
};

// Barra di ricerca, filtri e ordinamento usata negli elenchi della segreteria.
export function ListToolbar({
  search,
  onSearchChange,
  searchPlaceholder,
  sort,
  onSortChange,
  sortOptions,
  children,
}: ListToolbarProps) {
  return (
    <div className="list-toolbar">
      <label>
        Cerca
        <input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={searchPlaceholder}
        />
      </label>
      {children}
      <label>
        Ordina per
        <select value={sort} onChange={(event) => onSortChange(event.target.value)}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function matchesSearch(search: string, ...values: (string | undefined)[]) {
  const normalizedSearch = search.trim().toLowerCase();

  return (
    !normalizedSearch ||
    values.some((value) => value?.toLowerCase().includes(normalizedSearch))
  );
}

export function compareText(first = '', second = '') {
  return first.localeCompare(second, 'it', { sensitivity: 'base' });
}
