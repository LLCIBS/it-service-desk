import { useDepartments } from '../../context/DepartmentsContext';

export function DepartmentSelect({
  value,
  onChange,
  allowEmpty = true,
  emptyLabel = '—',
  required = false,
  className = 'input',
  placeholder = 'Выберите отдел',
}: {
  value: string;
  onChange: (value: string) => void;
  allowEmpty?: boolean;
  emptyLabel?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const { names, loading } = useDepartments();
  const hasCurrentValue = Boolean(value) && !names.includes(value);

  return (
    <select
      className={className}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
    >
      {allowEmpty && (
        <option value="">{loading && names.length === 0 ? 'Загрузка...' : emptyLabel || placeholder}</option>
      )}
      {hasCurrentValue && (
        <option value={value}>{value}</option>
      )}
      {names.map((name) => (
        <option key={name} value={name}>
          {name}
        </option>
      ))}
    </select>
  );
}
