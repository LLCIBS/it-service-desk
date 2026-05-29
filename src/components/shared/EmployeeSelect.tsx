import { useEffect, useState } from 'react';
import type { EmployeeLookup } from '../../types';
import { apiFetch } from '../../lib/api';

const ROLE_LABELS: Record<string, string> = {
  employee: 'Сотрудник',
  it_agent: 'ИТ',
  org_admin: 'Админ',
};

function formatOption(e: EmployeeLookup): string {
  const base = `${e.fullName} · ${e.department}`;
  const role = e.role ? ` (${ROLE_LABELS[e.role] ?? e.role})` : '';
  return e.email ? `${base} · ${e.email}${role}` : `${base}${role}`;
}

export function EmployeeSelect({
  value,
  onChange,
  label,
  allowEmpty = true,
}: {
  value: string;
  onChange: (id: string) => void;
  label: string;
  allowEmpty?: boolean;
}) {
  const [employees, setEmployees] = useState<EmployeeLookup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch('/api/employees/lookup')
      .then((r) => (r.ok ? r.json() : []))
      .then(setEmployees)
      .catch(() => setEmployees([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <select
        className="input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
      >
        {allowEmpty && <option value="">— не выбран —</option>}
        {employees.map((e) => (
          <option key={e.id} value={e.id}>
            {formatOption(e)}
          </option>
        ))}
      </select>
      {!loading && employees.length === 0 && (
        <p className="text-xs text-amber-600 mt-1">
          Нет сотрудников в справочнике. Добавьте их в разделе «Админ».
        </p>
      )}
    </div>
  );
}
