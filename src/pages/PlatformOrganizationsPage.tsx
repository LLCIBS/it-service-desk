import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, Plus, Building2, ExternalLink } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { apiFetch } from '../lib/api';
import { DEFAULT_DEPARTMENTS } from '../constants';

interface OrganizationListItem {
  id: string;
  slug: string;
  name: string;
  createdAt: string;
}

export function PlatformOrganizationsPage() {
  const { user, logout, switchOrganization } = useAuth();
  const navigate = useNavigate();
  const [list, setList] = useState<OrganizationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminName, setAdminName] = useState('');
  const [department, setDepartment] = useState('ИТ');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/platform/organizations');
      if (res.ok) setList(await res.json());
      else setList([]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    if (!slug.trim() || !name.trim() || !adminEmail || !adminPassword || !adminName.trim()) return;
    setCreating(true);
    setError('');
    try {
      const res = await apiFetch('/api/platform/organizations', {
        method: 'POST',
        body: JSON.stringify({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          adminEmail,
          adminPassword,
          adminName: adminName.trim(),
          department,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка создания');
        return;
      }
      setSlug('');
      setName('');
      setAdminEmail('');
      setAdminPassword('');
      setAdminName('');
      await load();
    } catch {
      setError('Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleManage = async (org: OrganizationListItem) => {
    try {
      await switchOrganization(org.id);
      navigate(`/o/${org.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка переключения');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/platform/login');
  };

  return (
    <div className="min-h-dvh flex flex-col bg-slate-50">
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="bg-blue-600 p-1.5 rounded-lg shrink-0">
            <LayoutDashboard className="text-white w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-slate-800 truncate">Платформа</h1>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button type="button" onClick={handleLogout} className="btn btn-secondary text-sm flex items-center gap-1 shrink-0">
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Выйти</span>
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full safe-bottom">
        <div className="card p-4 sm:p-6 space-y-4 mb-6 sm:mb-8">
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            Новая организация
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Код (slug) *</label>
              <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="acme" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Название *</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Acme Corp" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail админа *</label>
              <input type="email" className="input" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Пароль админа *</label>
              <input type="password" className="input" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ФИО админа *</label>
              <input className="input" value={adminName} onChange={(e) => setAdminName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Отдел админа</label>
              <select className="input" value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEFAULT_DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="button" onClick={handleCreate} disabled={creating} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {creating ? 'Создание...' : 'Создать организацию'}
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Организации
            </h2>
          </div>
          {loading ? (
            <p className="p-8 text-center text-slate-500">Загрузка...</p>
          ) : list.length === 0 ? (
            <p className="p-8 text-center text-slate-400">Организаций пока нет</p>
          ) : (
            <>
              <div className="md:hidden divide-y divide-slate-100">
                {list.map((org) => (
                  <div key={org.id} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{org.name}</p>
                      <p className="text-sm text-slate-500">/{org.slug}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleManage(org)}
                      className="btn btn-primary text-sm shrink-0 inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Управлять
                    </button>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-slate-500">
                      <th className="px-6 py-3 font-medium">Название</th>
                      <th className="px-6 py-3 font-medium">Код</th>
                      <th className="px-6 py-3 font-medium">Создана</th>
                      <th className="px-6 py-3 font-medium w-40" />
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((org) => (
                      <tr key={org.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                        <td className="px-6 py-3 font-medium text-slate-900">{org.name}</td>
                        <td className="px-6 py-3 text-slate-600">{org.slug}</td>
                        <td className="px-6 py-3 text-slate-500">
                          {new Date(org.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3">
                          <button
                            type="button"
                            onClick={() => handleManage(org)}
                            className="btn btn-primary text-sm inline-flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Управлять
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
