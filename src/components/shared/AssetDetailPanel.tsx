import { useState, useEffect } from 'react';
import { ArrowLeft, Pencil, Trash2, Save, X } from 'lucide-react';
import type { Asset, AssetStatus, AssetType } from '../../types';
import { apiFetch } from '../../lib/api';
import { StatusBadge } from './StatusBadge';
import { EmployeeSelect } from './EmployeeSelect';
import { SoftwareListEditor } from './SoftwareListEditor';
import { CredentialListEditor } from './CredentialListEditor';
import { DepartmentSelect } from '../../components/shared/DepartmentSelect';

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'computer', label: 'Компьютер' },
  { value: 'peripheral', label: 'Периферия' },
  { value: 'network', label: 'Сеть' },
  { value: 'other', label: 'Прочее' },
];

const STATUSES: { value: AssetStatus; label: string }[] = [
  { value: 'in_use', label: 'В работе' },
  { value: 'spare', label: 'На складе' },
  { value: 'repair', label: 'В ремонте' },
  { value: 'decommissioned', label: 'Списано' },
];

export function AssetDetailPanel({
  assetId,
  defaultAssetType,
  onClose,
  onDeleted,
  onNavigateToTicket,
  onAssetUpdated,
  onCreated,
}: {
  assetId: string | null;
  defaultAssetType: AssetType;
  onClose: () => void;
  onDeleted: () => void;
  onNavigateToTicket?: (ticketId: string) => void;
  onAssetUpdated?: () => void;
  onCreated?: (id: string) => void;
}) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(!assetId);
  const [form, setForm] = useState<Record<string, string | number | undefined>>({});

  const load = async (id: string) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/assets/${id}`);
      if (res.ok) {
        const data: Asset = await res.json();
        setAsset(data);
        setFormFromAsset(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const setFormFromAsset = (a: Asset) => {
    setForm({
      assetType: a.assetType,
      subtype: a.subtype ?? '',
      inventoryNumber: a.inventoryNumber ?? '',
      name: a.name,
      manufacturer: a.manufacturer ?? '',
      model: a.model ?? '',
      serialNumber: a.serialNumber ?? '',
      status: a.status,
      location: a.location ?? '',
      department: a.department ?? '',
      responsibleEmployeeId: a.responsibleEmployeeId ?? '',
      assignedEmployeeId: a.assignedEmployeeId ?? '',
      notes: a.notes ?? '',
      cpu: a.hardwareSpecs?.cpu ?? '',
      ramGb: a.hardwareSpecs?.ramGb ?? '',
      storage: a.hardwareSpecs?.storage ?? '',
      osName: a.hardwareSpecs?.osName ?? '',
      osVersion: a.hardwareSpecs?.osVersion ?? '',
      ipAddress: a.hardwareSpecs?.ipAddress ?? '',
      macAddress: a.hardwareSpecs?.macAddress ?? '',
      hostname: a.hardwareSpecs?.hostname ?? '',
    });
  };

  useEffect(() => {
    if (assetId) {
      setEditing(false);
      load(assetId);
    } else {
      setAsset(null);
      setEditing(true);
      setForm({
        assetType: defaultAssetType,
        status: 'in_use',
        name: '',
      });
    }
  }, [assetId, defaultAssetType]);

  const save = async () => {
    const body = {
      assetType: form.assetType as AssetType,
      subtype: form.subtype || undefined,
      inventoryNumber: form.inventoryNumber || undefined,
      name: form.name,
      manufacturer: form.manufacturer,
      model: form.model,
      serialNumber: form.serialNumber,
      status: form.status as AssetStatus,
      location: form.location,
      department: form.department,
      responsibleEmployeeId: form.responsibleEmployeeId || undefined,
      assignedEmployeeId: form.assignedEmployeeId || undefined,
      notes: form.notes,
      hardwareSpecs: {
        cpu: form.cpu,
        ramGb: form.ramGb ? Number(form.ramGb) : undefined,
        storage: form.storage,
        osName: form.osName,
        osVersion: form.osVersion,
        ipAddress: form.ipAddress,
        macAddress: form.macAddress,
        hostname: form.hostname,
      },
    };

    if (!body.name) return;

    const res = assetId
      ? await apiFetch(`/api/assets/${assetId}`, { method: 'PATCH', body: JSON.stringify(body) })
      : await apiFetch('/api/assets', { method: 'POST', body: JSON.stringify(body) });

    if (res.ok) {
      const data: Asset = await res.json();
      setAsset(data);
      setFormFromAsset(data);
      setEditing(false);
      onAssetUpdated?.();
      if (!assetId) {
        onCreated?.(data.id);
        load(data.id);
      }
    }
  };

  const remove = async () => {
    if (!assetId || !confirm('Удалить актив? Связанные учётные записи и ПО будут удалены.')) return;
    const res = await apiFetch(`/api/assets/${assetId}`, { method: 'DELETE' });
    if (res.ok) onDeleted();
  };

  if (!assetId && !editing) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-400">
        <p>Выберите актив или создайте новый</p>
      </div>
    );
  }

  if (loading && assetId) {
    return <div className="flex-1 flex items-center justify-center">Загрузка...</div>;
  }

  const showSpecs = (form.assetType as AssetType) === 'computer' || (form.assetType as AssetType) === 'network';

  return (
    <div className="flex-1 flex flex-col bg-white overflow-hidden h-full min-h-0">
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 sticky top-0 bg-white z-10 shrink-0">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <button type="button" onClick={onClose} className="md:hidden p-2 hover:bg-slate-100 rounded-lg shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            {asset && !editing ? (
              <>
                <h3 className="font-bold text-slate-900 break-words">{asset.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <StatusBadge status={asset.status} />
                  {asset.inventoryNumber && (
                    <span className="text-xs text-slate-500">№ {asset.inventoryNumber}</span>
                  )}
                </div>
              </>
            ) : (
              <h3 className="font-bold text-slate-900">{assetId ? 'Редактирование' : 'Новый актив'}</h3>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0 w-full sm:w-auto justify-end">
          {asset && !editing && (
            <>
              <button type="button" onClick={() => setEditing(true)} className="btn btn-secondary text-sm p-2 min-w-[40px]">
                <Pencil className="w-4 h-4" />
              </button>
              <button type="button" onClick={remove} className="btn btn-secondary text-sm p-2 text-red-600 min-w-[40px]">
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
          {editing && (
            <>
              <button type="button" onClick={save} className="btn btn-primary text-sm inline-flex items-center gap-1 flex-1 sm:flex-none">
                <Save className="w-4 h-4" />
                <span className="sm:inline">Сохранить</span>
              </button>
              {assetId && (
                <button type="button" onClick={() => { setEditing(false); if (asset) setFormFromAsset(asset); }} className="btn btn-secondary text-sm p-2">
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 min-h-0 safe-bottom">
        {editing ? (
          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Тип</label>
                <select className="input w-full" value={String(form.assetType)} onChange={(e) => setForm({ ...form, assetType: e.target.value })}>
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Статус</label>
                <select className="input w-full" value={String(form.status)} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
                <input className="input w-full" value={String(form.name ?? '')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Инв. номер</label>
                <input className="input w-full" value={String(form.inventoryNumber ?? '')} onChange={(e) => setForm({ ...form, inventoryNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Производитель</label>
                <input className="input w-full" value={String(form.manufacturer ?? '')} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Модель</label>
                <input className="input w-full" value={String(form.model ?? '')} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Серийный номер</label>
                <input className="input w-full" value={String(form.serialNumber ?? '')} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Локация</label>
                <input className="input w-full" value={String(form.location ?? '')} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Отдел</label>
                <DepartmentSelect
                  value={String(form.department ?? '')}
                  onChange={(v) => setForm({ ...form, department: v })}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EmployeeSelect label="Ответственный ИТ" value={String(form.responsibleEmployeeId ?? '')} onChange={(id) => setForm({ ...form, responsibleEmployeeId: id })} />
              <EmployeeSelect label="Закреплённый пользователь" value={String(form.assignedEmployeeId ?? '')} onChange={(id) => setForm({ ...form, assignedEmployeeId: id })} />
            </div>
            {showSpecs && (
              <div className="border-t pt-4 space-y-4">
                <h4 className="font-semibold text-slate-800">Характеристики</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input className="input" placeholder="CPU" value={String(form.cpu ?? '')} onChange={(e) => setForm({ ...form, cpu: e.target.value })} />
                  <input className="input" type="number" placeholder="RAM (ГБ)" value={String(form.ramGb ?? '')} onChange={(e) => setForm({ ...form, ramGb: e.target.value })} />
                  <input className="input" placeholder="Диск" value={String(form.storage ?? '')} onChange={(e) => setForm({ ...form, storage: e.target.value })} />
                  <input className="input" placeholder="ОС" value={String(form.osName ?? '')} onChange={(e) => setForm({ ...form, osName: e.target.value })} />
                  <input className="input" placeholder="Версия ОС" value={String(form.osVersion ?? '')} onChange={(e) => setForm({ ...form, osVersion: e.target.value })} />
                  <input className="input" placeholder="IP" value={String(form.ipAddress ?? '')} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })} />
                  <input className="input" placeholder="MAC" value={String(form.macAddress ?? '')} onChange={(e) => setForm({ ...form, macAddress: e.target.value })} />
                  <input className="input" placeholder="Имя хоста" value={String(form.hostname ?? '')} onChange={(e) => setForm({ ...form, hostname: e.target.value })} />
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Заметки</label>
              <textarea className="input w-full min-h-[80px]" value={String(form.notes ?? '')} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
        ) : asset ? (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-50 sm:border-0">
                <span className="text-slate-500">Производитель:</span>
                <span className="font-medium text-slate-800 break-words">{asset.manufacturer || '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-50 sm:border-0">
                <span className="text-slate-500">Модель:</span>
                <span className="font-medium text-slate-800 break-words">{asset.model || '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-50 sm:border-0">
                <span className="text-slate-500">Серийный №:</span>
                <span className="font-medium text-slate-800 break-words">{asset.serialNumber || '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-50 sm:border-0">
                <span className="text-slate-500">Локация:</span>
                <span className="font-medium text-slate-800 break-words">{asset.location || '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-50 sm:border-0">
                <span className="text-slate-500">Отдел:</span>
                <span className="font-medium text-slate-800">{asset.department || '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 border-b border-slate-50 sm:border-0">
                <span className="text-slate-500">Ответственный:</span>
                <span className="font-medium text-slate-800 break-words">{asset.responsibleEmployeeName || '—'}</span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5 py-1 sm:col-span-2">
                <span className="text-slate-500">Пользователь:</span>
                <span className="font-medium text-slate-800 break-words">{asset.assignedEmployeeName || '—'}</span>
              </div>
            </section>
            {asset.hardwareSpecs && (
              <section>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Характеристики</h4>
                <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-4 rounded-xl">
                  {asset.hardwareSpecs.cpu && <div>CPU: {asset.hardwareSpecs.cpu}</div>}
                  {asset.hardwareSpecs.ramGb != null && <div>RAM: {asset.hardwareSpecs.ramGb} ГБ</div>}
                  {asset.hardwareSpecs.storage && <div>Диск: {asset.hardwareSpecs.storage}</div>}
                  {asset.hardwareSpecs.osName && <div>ОС: {asset.hardwareSpecs.osName} {asset.hardwareSpecs.osVersion}</div>}
                  {asset.hardwareSpecs.ipAddress && <div>IP: {asset.hardwareSpecs.ipAddress}</div>}
                  {asset.hardwareSpecs.macAddress && <div>MAC: {asset.hardwareSpecs.macAddress}</div>}
                  {asset.hardwareSpecs.hostname && <div>Хост: {asset.hardwareSpecs.hostname}</div>}
                </div>
              </section>
            )}
            {asset.children.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Периферия</h4>
                <ul className="text-sm space-y-1">
                  {asset.children.map((c) => (
                    <li key={c.id} className="text-slate-700">{c.name} {c.inventoryNumber && `(№ ${c.inventoryNumber})`}</li>
                  ))}
                </ul>
              </section>
            )}
            <SoftwareListEditor asset={asset} onUpdated={setAsset} />
            <CredentialListEditor
              assetId={asset.id}
              credentials={asset.credentials}
              onUpdated={() => load(asset.id)}
            />
            {asset.relatedTickets.length > 0 && (
              <section>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">Связанные заявки</h4>
                <ul className="space-y-2">
                  {asset.relatedTickets.map((t) => (
                    <li key={t.id}>
                      <button
                        type="button"
                        onClick={() => onNavigateToTicket?.(t.id)}
                        className="w-full text-left p-3 border border-slate-200 rounded-lg hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-800">{t.title}</span>
                        <span className="text-xs text-slate-500 block mt-0.5">
                          {t.requesterName} · {new Date(t.createdAt).toLocaleDateString()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {asset.notes && (
              <section>
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">Заметки</h4>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{asset.notes}</p>
              </section>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}
