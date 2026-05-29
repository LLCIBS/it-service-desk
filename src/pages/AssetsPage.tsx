import { useState, useEffect, useCallback } from 'react';
import { Plus, HardDrive, Monitor, KeyRound } from 'lucide-react';
import type { AssetCredential, AssetStatus, AssetSummary, AssetType } from '../types';
import { apiFetch } from '../lib/api';
import { AssetListPanel } from '../components/shared/AssetListPanel';
import { AssetDetailPanel } from '../components/shared/AssetDetailPanel';
import { CredentialListEditor } from '../components/shared/CredentialListEditor';
import { SearchInput } from '../components/shared/SearchInput';

type Tab = 'devices' | 'peripherals' | 'credentials';

export function AssetsPage({
  initialAssetId,
  onNavigateToTicket,
}: {
  initialAssetId?: string | null;
  onNavigateToTicket?: (ticketId: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('devices');
  const [items, setItems] = useState<AssetSummary[]>([]);
  const [credentials, setCredentials] = useState<AssetCredential[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(initialAssetId ?? null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssetStatus | 'all'>('all');
  const [credSearch, setCredSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const loadAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tab === 'peripherals') params.set('type', 'peripheral');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('q', search.trim());

      const res = await apiFetch(`/api/assets?${params}`);
      if (res.ok) {
        let list: AssetSummary[] = await res.json();
        if (tab === 'devices') {
          list = list.filter((a) => a.assetType !== 'peripheral');
        }
        setItems(list);
      } else setItems([]);
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, search]);

  const loadCredentials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/credentials?assetId=standalone');
      if (res.ok) {
        let list: AssetCredential[] = await res.json();
        if (credSearch.trim()) {
          const q = credSearch.toLowerCase();
          list = list.filter(
            (c) =>
              c.title.toLowerCase().includes(q) ||
              (c.username?.toLowerCase().includes(q) ?? false) ||
              (c.assetName?.toLowerCase().includes(q) ?? false)
          );
        }
        setCredentials(list);
      } else setCredentials([]);
    } finally {
      setLoading(false);
    }
  }, [credSearch]);

  useEffect(() => {
    if (initialAssetId) {
      setSelectedId(initialAssetId);
      setTab('devices');
    }
  }, [initialAssetId]);

  useEffect(() => {
    if (tab === 'credentials') loadCredentials();
    else loadAssets();
  }, [tab, loadAssets, loadCredentials]);

  const defaultAssetType: AssetType = tab === 'peripherals' ? 'peripheral' : 'computer';

  const tabs: { id: Tab; label: string; icon: typeof Monitor }[] = [
    { id: 'devices', label: 'Устройства', icon: Monitor },
    { id: 'peripherals', label: 'Периферия', icon: HardDrive },
    { id: 'credentials', label: 'Учётные записи', icon: KeyRound },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSelectedId(null);
              setCreating(false);
            }}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
        {tab !== 'credentials' && (
          <button
            type="button"
            onClick={() => {
              setCreating(true);
              setSelectedId(null);
            }}
            className="ml-auto btn btn-primary text-sm inline-flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        )}
      </div>

      {tab === 'credentials' ? (
        <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
          <div className="mb-4">
            <SearchInput value={credSearch} onChange={setCredSearch} placeholder="Поиск учётных записей..." />
          </div>
          {loading ? (
            <p className="text-slate-500">Загрузка...</p>
          ) : (
            <div className="card p-6">
              <CredentialListEditor
                credentials={credentials}
                onUpdated={loadCredentials}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <AssetListPanel
            items={items}
            selectedId={creating ? null : selectedId}
            onSelect={(id) => {
              setCreating(false);
              setSelectedId(id);
            }}
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            emptyText={loading ? 'Загрузка...' : 'Активы не найдены'}
          />
          <div className={`flex-1 flex flex-col ${selectedId || creating ? 'flex' : 'hidden md:flex'}`}>
            {(selectedId || creating) ? (
              <AssetDetailPanel
                assetId={creating ? null : selectedId}
                defaultAssetType={defaultAssetType}
                onClose={() => {
                  setSelectedId(null);
                  setCreating(false);
                }}
                onDeleted={() => {
                  setSelectedId(null);
                  setCreating(false);
                  loadAssets();
                }}
                onNavigateToTicket={onNavigateToTicket}
                onAssetUpdated={loadAssets}
                onCreated={(id) => {
                  setSelectedId(id);
                  setCreating(false);
                }}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <p>Выберите актив из списка</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
