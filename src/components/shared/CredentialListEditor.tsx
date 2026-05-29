import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { Asset, AssetCredential, CredentialType } from '../../types';
import { apiFetch } from '../../lib/api';
import { PasswordReveal } from './PasswordReveal';

const CRED_TYPES: { value: CredentialType; label: string }[] = [
  { value: 'local', label: 'Локальная' },
  { value: 'domain', label: 'Доменная' },
  { value: 'wifi', label: 'Wi-Fi' },
  { value: 'vpn', label: 'VPN' },
  { value: 'service', label: 'Сервис' },
  { value: 'other', label: 'Прочее' },
];

export function CredentialListEditor({
  assetId,
  credentials,
  onUpdated,
  compact = false,
}: {
  assetId?: string;
  credentials: AssetCredential[];
  onUpdated: () => void;
  compact?: boolean;
}) {
  const [title, setTitle] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [credentialType, setCredentialType] = useState<CredentialType>('local');
  const [url, setUrl] = useState('');

  const add = async () => {
    if (!title.trim() || !password) return;
    const res = await apiFetch('/api/credentials', {
      method: 'POST',
      body: JSON.stringify({
        title,
        username,
        password,
        credentialType,
        url,
        assetId: assetId || undefined,
      }),
    });
    if (res.ok) {
      setTitle('');
      setUsername('');
      setPassword('');
      setUrl('');
      onUpdated();
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить учётную запись?')) return;
    const res = await apiFetch(`/api/credentials/${id}`, { method: 'DELETE' });
    if (res.ok) onUpdated();
  };

  return (
    <section className="space-y-4">
      {!compact && (
        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Учётные записи и пароли</h4>
      )}
      <ul className="space-y-2">
        {credentials.map((c) => (
          <li key={c.id} className="p-3 bg-slate-50 rounded-lg space-y-2">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-slate-800">{c.title}</p>
                <p className="text-xs text-slate-500">
                  {CRED_TYPES.find((t) => t.value === c.credentialType)?.label}
                  {c.username && ` · ${c.username}`}
                  {c.assetName && ` · ${c.assetName}`}
                </p>
              </div>
              <button type="button" onClick={() => remove(c.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {c.hasPassword && <PasswordReveal revealUrl={`/api/credentials/${c.id}/reveal`} />}
            {c.url && (
              <a href={c.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                {c.url}
              </a>
            )}
          </li>
        ))}
        {credentials.length === 0 && (
          <p className="text-sm text-slate-400 italic">Учётные записи не добавлены</p>
        )}
      </ul>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <input className="input" placeholder="Название *" value={title} onChange={(e) => setTitle(e.target.value)} />
        <select className="input" value={credentialType} onChange={(e) => setCredentialType(e.target.value as CredentialType)}>
          {CRED_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input className="input" placeholder="Логин" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input className="input" type="password" placeholder="Пароль *" value={password} onChange={(e) => setPassword(e.target.value)} />
        <input className="input sm:col-span-2" placeholder="URL" value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      <button type="button" onClick={add} className="btn btn-secondary text-sm inline-flex items-center gap-1 w-full sm:w-auto">
        <Plus className="w-4 h-4" />
        Добавить учётную запись
      </button>
    </section>
  );
}
