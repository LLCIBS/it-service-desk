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
  className = '',
}: {
  items: AssetSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: AssetStatus | 'all';
  onStatusFilterChange: (v: AssetStatus | 'all') => void;
  emptyText?: string;
  className?: string;
}) {
  const statuses: { value: AssetStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'Все' },
    { value: 'in_use', label: 'В работе' },
    { value: 'spare', label: 'На складе' },
    { value: 'repair', label: 'В ремонте' },
    { value: 'decommissioned', label: 'Списано' },
  ];

  return (
    <div className={`w-full md:w-1/3 md:min-w-0 md:max-w-md border-r border-slate-200 bg-white flex flex-col min-h-0 ${className}`}>
      <div className="p-3 sm:p-4 border-b border-slate-200 space-y-3 shrink-0">
        <SearchInput value={search} onChange={onSearchChange} placeholder="Поиск..." />
        <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5 flex-wrap sm:flex-wrap">
          {statuses.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onStatusFilterChange(s.value)}
              className={`text-xs px-2 py-1 rounded-md whitespace-nowrap shrink-0 ${
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
              <div className="flex justify-between items-start gap-2 mb-1 min-w-0">
                <span className="font-semibold text-slate-800 line-clamp-2 min-w-0">{a.name}</span>
                <StatusBadge status={a.status} />
              </div>
              <p className="text-xs text-slate-500 break-words">
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
