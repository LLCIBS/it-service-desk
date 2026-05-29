import type { AssetSummary, AssetStatus } from '../../types';
import { StatusBadge } from './StatusBadge';
import { SearchInput } from './SearchInput';

export function AssetListPanel({
  items,
  selectedId,
  onSelect,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  emptyText = 'Ничего не найдено',
}: {
  items: AssetSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: AssetStatus | 'all';
  onStatusFilterChange: (v: AssetStatus | 'all') => void;
  emptyText?: string;
}) {
  const statuses: { value: AssetStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'in_use', label: 'В работе' },
    { value: 'spare', label: 'На складе' },
    { value: 'repair', label: 'В ремонте' },
    { value: 'decommissioned', label: 'Списано' },
  ];

  return (
    <div className="w-full md:w-1/3 border-r border-slate-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-200 space-y-3">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Поиск..." />
        <div className="flex flex-wrap gap-1">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onStatusFilterChange(s.value)}
              className={`text-xs px-2 py-1 rounded-md ${
                statusFilter === s.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {items.length === 0 ? (
          <p className="p-6 text-center text-slate-400 text-sm">{emptyText}</p>
        ) : (
          items.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => onSelect(a.id)}
              className={`w-full text-left p-4 border-b border-slate-100 hover:bg-slate-50 ${
                selectedId === a.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-slate-800 line-clamp-1">{a.name}</span>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-slate-500">
                {a.inventoryNumber ? `№ ${a.inventoryNumber}` : 'Без инв. №'}
                {a.assignedEmployeeName && ` · ${a.assignedEmployeeName}`}
              </p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
