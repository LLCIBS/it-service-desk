import { useState } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import type { Asset, AssetSoftware } from '../../types';
import { apiFetch } from '../../lib/api';
import { PasswordReveal } from './PasswordReveal';

export function SoftwareListEditor({
  asset,
  onUpdated,
}: {
  asset: Asset;
  onUpdated: (asset: Asset) => void;
}) {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setVersion('');
    setLicenseKey('');
    setError('');
  };

  const startEdit = (sw: AssetSoftware) => {
    setEditingId(sw.id);
    setName(sw.name);
    setVersion(sw.version ?? '');
    setLicenseKey('');
    setError('');
  };

  const add = async () => {
    if (!name.trim()) {
      setError('Укажите название');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await apiFetch(`/api/assets/${asset.id}/software`, {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          version: version.trim() || undefined,
          licenseKey: licenseKey.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка добавления');
        return;
      }
      onUpdated(await res.json());
      resetForm();
    } catch {
      setError('Ошибка добавления');
    } finally {
      setSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editingId || !name.trim()) {
      setError('Укажите название');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body: Record<string, string> = {
        name: name.trim(),
        version: version.trim(),
      };
      if (licenseKey.trim()) body.licenseKey = licenseKey.trim();

      const res = await apiFetch(`/api/assets/${asset.id}/software/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка сохранения');
        return;
      }
      onUpdated(await res.json());
      resetForm();
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (sw: AssetSoftware) => {
    if (!confirm(`Удалить «${sw.name}»?`)) return;
    const res = await apiFetch(`/api/assets/${asset.id}/software/${sw.id}`, { method: 'DELETE' });
    if (res.ok) {
      if (editingId === sw.id) resetForm();
      onUpdated(await res.json());
    }
  };

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Программное обеспечение</h4>
      <ul className="space-y-2">
        {asset.software.map((sw) => (
          <li
            key={sw.id}
            className={`flex items-start justify-between gap-2 p-3 rounded-lg ${
              editingId === sw.id ? 'bg-blue-50 ring-1 ring-blue-200' : 'bg-slate-50'
            }`}
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-800">{sw.name}</p>
              {sw.version && <p className="text-xs text-slate-500">v{sw.version}</p>}
              {sw.hasLicenseKey && (
                <div className="mt-2">
                  <p className="text-[10px] text-slate-400 mb-1">Лицензионный ключ</p>
                  <PasswordReveal
                    revealUrl={`/api/assets/${asset.id}/software/${sw.id}/reveal-license`}
                    masked="••••••••"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => startEdit(sw)}
                className="p-1 text-slate-500 hover:bg-slate-100 hover:text-blue-600 rounded"
                title="Изменить"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => remove(sw)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
                title="Удалить"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </li>
        ))}
        {asset.software.length === 0 && (
          <p className="text-sm text-slate-400 italic">ПО не указано</p>
        )}
      </ul>

      <div className="card p-4 space-y-3">
        <h5 className="text-sm font-semibold text-slate-800">
          {editingId ? 'Редактирование ПО' : 'Добавить ПО'}
        </h5>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
            <input className="input w-full" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Версия</label>
            <input className="input w-full" value={version} onChange={(e) => setVersion(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              {editingId ? 'Новый лицензионный ключ' : 'Лицензионный ключ'}
            </label>
            <input
              className="input w-full"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder={editingId ? 'Оставьте пустым, чтобы не менять' : ''}
            />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          {editingId ? (
            <>
              <button
                type="button"
                onClick={saveEdit}
                disabled={saving}
                className="btn btn-primary text-sm"
              >
                {saving ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" onClick={resetForm} className="btn btn-secondary text-sm">
                Отмена
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={add}
              disabled={saving}
              className="btn btn-secondary text-sm inline-flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              {saving ? 'Добавление...' : 'Добавить ПО'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
