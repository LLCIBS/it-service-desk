import { useEffect, useState } from 'react';
import type { AssetSummary } from '../../types';
import { apiFetch } from '../../lib/api';

export function AssetPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (assetId: string, asset?: AssetSummary) => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AssetSummary[]>([]);
  const [selected, setSelected] = useState<AssetSummary | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      apiFetch(`/api/assets/lookup?q=${encodeURIComponent(query)}`)
        .then((r) => (r.ok ? r.json() : []))
        .then(setResults)
        .catch(() => setResults([]));
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!value) setSelected(null);
  }, [value]);

  const pick = (asset: AssetSummary) => {
    setSelected(asset);
    onChange(asset.id, asset);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-slate-700 mb-1">Оборудование (необязательно)</label>
        {selected ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50">
          <div className="min-w-0">
            <p className="font-medium text-slate-800 break-words">{selected.name}</p>
            <p className="text-xs text-slate-500">
              {selected.inventoryNumber ? `Инв. № ${selected.inventoryNumber}` : 'Без инв. номера'}
            </p>
          </div>
          <button
            type="button"
            className="text-sm text-red-600 hover:underline"
            onClick={() => {
              setSelected(null);
              onChange('');
            }}
          >
            Убрать
          </button>
        </div>
      ) : (
        <>
          <input
            className="input w-full"
            placeholder="Поиск по названию или инв. номеру..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
          />
          {open && results.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {results.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                    onClick={() => pick(a)}
                  >
                    <span className="font-medium">{a.name}</span>
                    {a.inventoryNumber && (
                      <span className="text-slate-500 ml-2">({a.inventoryNumber})</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
