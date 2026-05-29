import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
  const [saving, setSaving] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await apiFetch(`/api/assets/${asset.id}/software`, {
        method: 'POST',
        body: JSON.stringify({ name, version, licenseKey: licenseKey || undefined }),
      });
      if (res.ok) {
        onUpdated(await res.json());
        setName('');
        setVersion('');
        setLicenseKey('');
      }
    } finally {
      setSaving(false);
    }
  };

  const remove = async (sw: AssetSoftware) => {
    if (!confirm(`Удалить «${sw.name}»?`)) return;
    const res = await apiFetch(`/api/assets/${asset.id}/software/${sw.id}`, { method: 'DELETE' });
    if (res.ok) onUpdated(await res.json());
  };

  return (
    <section className="space-y-4">
      <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Программное обеспечение</h4>
      <ul className="space-y-2">
        {asset.software.map((sw) => (
          <li key={sw.id} className="flex items-start justify-between gap-2 p-3 bg-slate-50 rounded-lg">
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
            <button type="button" onClick={() => remove(sw)} className="p-1 text-red-500 hover:bg-red-50 rounded">
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        ))}
        {asset.software.length === 0 && (
          <p className="text-sm text-slate-400 italic">ПО не указано</p>
        )}
      </ul>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input className="input" placeholder="Название" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input" placeholder="Версия" value={version} onChange={(e) => setVersion(e.target.value)} />
        <input className="input" placeholder="Лицензионный ключ" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value)} />
      </div>
      <button type="button" onClick={add} disabled={saving} className="btn btn-secondary text-sm inline-flex items-center gap-1 w-full sm:w-auto">
        <Plus className="w-4 h-4" />
        Добавить ПО
      </button>
    </section>
  );
}
