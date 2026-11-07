export type CheckboxOption = {
  value: string;
  label: string;
};

type CheckboxGroupProps = {
  legend: string;
  options: CheckboxOption[];
  selectedValues: string[];
  onChange: (selectedValues: string[]) => void;
  hint?: string;
  emptyMessage?: string;
  disabled?: boolean;
};

// Selezione multipla con caselle di spunta: ogni opzione si seleziona o
// deseleziona con un semplice clic, senza Ctrl/Cmd, e lo stato è visibile.
export function CheckboxGroup({
  legend,
  options,
  selectedValues,
  onChange,
  hint,
  emptyMessage = 'Nessuna opzione disponibile.',
  disabled = false,
}: CheckboxGroupProps) {
  const hintId = `${legend.replace(/\W+/g, '-').toLowerCase()}-hint`;

  function toggle(value: string, checked: boolean) {
    const nextSelected = new Set(selectedValues);

    if (checked) {
      nextSelected.add(value);
    } else {
      nextSelected.delete(value);
    }

    onChange(
      options
        .map((option) => option.value)
        .filter((optionValue) => nextSelected.has(optionValue))
    );
  }

  const selectedCount = options.filter((option) =>
    selectedValues.includes(option.value)
  ).length;

  return (
    <fieldset
      className="checkbox-group"
      aria-describedby={hint ? hintId : undefined}
      disabled={disabled}
    >
      <legend>{legend}</legend>
      {hint ? (
        <p className="field-hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      {options.length > 0 ? (
        <>
          <div className="checkbox-group__options">
            {options.map((option) => (
              <label className="checkbox-option" key={option.value}>
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(event) => toggle(option.value, event.target.checked)}
                />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
          <p className="field-hint checkbox-group__count" aria-live="polite">
            {selectedCount === 0
              ? 'Nessun corso selezionato.'
              : selectedCount === 1
                ? '1 corso selezionato.'
                : `${selectedCount} corsi selezionati.`}
          </p>
        </>
      ) : (
        <p className="field-hint">{emptyMessage}</p>
      )}
    </fieldset>
  );
}
