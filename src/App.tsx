import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Search, 
  User, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Paperclip, 
  Send, 
  X,
  Ticket as TicketIcon,
  Monitor,
  HardDrive,
  Cpu,
  Globe,
  Shield,
  ArrowLeft,
  MessageSquare,
  Users,
  Trash2,
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Ticket, TicketStatus, Priority, Comment, DirectoryEmployeeAdmin, UserRole } from './types';
import { useAuth } from './hooks/useAuth';
import { apiFetch, ticketFileUrl } from './lib/api';
import { AssetsPage } from './pages/AssetsPage';
import { AssetPicker } from './components/shared/AssetPicker';
import { LinkedAssetCard } from './components/shared/LinkedAssetCard';
import { AppNav, type AppView } from './components/shared/AppNav';
import { SuperAdminBanner } from './components/shared/SuperAdminBanner';
import { DepartmentsProvider, useDepartments } from './context/DepartmentsContext';
import { DepartmentSelect } from './components/shared/DepartmentSelect';
import { DepartmentsDirectory } from './components/shared/DepartmentsDirectory';

const PROBLEM_TYPES = [
  { id: 'hardware', label: 'Аппаратное обеспечение (ПК, ноутбук, принтер...)', shortLabel: 'Аппаратное обеспечение' },
  { id: 'peripherals', label: 'Периферийное устройство (мышь, клавиатура...)', shortLabel: 'Периферия' },
  { id: 'software', label: 'Программное обеспечение', shortLabel: 'ПО' },
  { id: 'network', label: 'Локальная сеть / интернет / VPN', shortLabel: 'Сеть / VPN' },
  { id: 'access', label: 'Доступ к системам / правам', shortLabel: 'Доступ / права' },
  { id: 'other', label: 'Прочее', shortLabel: 'Прочее' },
];

const PROBLEM_TYPE_ICONS: Record<string, typeof Monitor> = {
  hardware: Monitor,
  peripherals: Cpu,
  software: FileText,
  network: Globe,
  access: Shield,
  other: TicketIcon,
};

const PRIORITIES: { value: Priority; label: string; color: string }[] = [
  { value: 'low', label: 'Низкий', color: 'bg-blue-100 text-blue-700' },
  { value: 'medium', label: 'Средний', color: 'bg-green-100 text-green-700' },
  { value: 'high', label: 'Высокий', color: 'bg-orange-100 text-orange-700' },
  { value: 'critical', label: 'Критический', color: 'bg-red-100 text-red-700' },
];

const STATUSES: { value: TicketStatus; label: string; color: string }[] = [
  { value: 'new', label: 'Новая', color: 'bg-blue-100 text-blue-700' },
  { value: 'in-progress', label: 'В работе', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'waiting-for-info', label: 'Ожидает информации', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'waiting-for-resources', label: 'Ожидает ресурсов', color: 'bg-purple-100 text-purple-700' },
  { value: 'resolved', label: 'Решена', color: 'bg-green-100 text-green-700' },
  { value: 'closed', label: 'Закрыта', color: 'bg-gray-100 text-gray-700' },
  { value: 'cancelled', label: 'Отменена', color: 'bg-red-100 text-red-700' },
];

export default function App() {
  const { user, organization, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const role = user!.role;

  const defaultView: AppView =
    role === 'super_admin' || role === 'org_admin'
      ? 'admin'
      : role === 'it_agent'
        ? 'it'
        : 'employee';
  const [view, setView] = useState<AppView>(defaultView);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [assetsFocusId, setAssetsFocusId] = useState<string | null>(null);
  const [pendingTicketId, setPendingTicketId] = useState<string | null>(null);

  const canAccessIt = role === 'it_agent' || role === 'org_admin' || role === 'super_admin';
  const canAccessAdmin = role === 'org_admin' || role === 'super_admin';
  const canCreateTickets = role !== 'super_admin';

  useEffect(() => {
    if (!canCreateTickets && (view === 'employee' || view === 'my-tickets')) setView('it');
    if (view === 'it' && !canAccessIt) setView('employee');
    if (view === 'admin' && !canAccessAdmin) setView('employee');
    if (view === 'assets' && !canAccessIt) setView('employee');
  }, [view, canAccessIt, canAccessAdmin, canCreateTickets]);

  useEffect(() => {
    if (view === 'it' && pendingTicketId) {
      const ticket = tickets.find((t) => t.id === pendingTicketId);
      if (ticket) setSelectedTicket(ticket);
      setPendingTicketId(null);
    }
  }, [view, pendingTicketId, tickets]);

  const openAssetInModule = (assetId: string) => {
    setAssetsFocusId(assetId);
    setView('assets');
  };

  const fetchTickets = async () => {
    try {
      const res = await apiFetch('/api/tickets');
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Failed to fetch tickets', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleCreateTicket = async (formData: FormData) => {
    try {
      const res = await apiFetch('/api/tickets', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        await fetchTickets();
        return true;
      }
    } catch (err) {
      console.error('Failed to create ticket', err);
    }
    return false;
  };

  const handleUpdateTicket = async (id: string, updates: Partial<Ticket>) => {
    try {
      const res = await apiFetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setTickets(tickets.map(t => t.id === id ? updated : t));
        if (selectedTicket?.id === id) setSelectedTicket(updated);
      }
    } catch (err) {
      console.error('Failed to update ticket', err);
    }
  };

  const handleAddComment = async (id: string, text: string) => {
    try {
      const res = await apiFetch(`/api/tickets/${id}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const comment = await res.json();
        setTickets(tickets.map(t => {
          if (t.id === id) {
            return { ...t, internalComments: [...t.internalComments, comment] };
          }
          return t;
        }));
        if (selectedTicket?.id === id) {
          setSelectedTicket({ ...selectedTicket, internalComments: [...selectedTicket.internalComments, comment] });
        }
      }
    } catch (err) {
      console.error('Failed to add comment', err);
    }
  };

  const handleLogout = async () => {
    await logout();
    if (isSuperAdmin) {
      navigate('/platform/login');
    } else {
      navigate(`/o/${organization!.slug}/login`);
    }
  };

  return (
    <DepartmentsProvider>
    <div className="h-dvh flex flex-col overflow-hidden">
      {isSuperAdmin && <SuperAdminBanner />}
      <AppNav
        view={view}
        setView={setView}
        organizationName={organization?.name}
        userLabel={user?.employee?.fullName ?? user?.email ?? ''}
        canAccessIt={canAccessIt}
        canAccessAdmin={canAccessAdmin}
        canCreateTickets={canCreateTickets}
        onLogout={handleLogout}
        onOpenAssets={() => setAssetsFocusId(null)}
      />

      <main className="flex-1 min-h-0 overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'employee' ? (
            <EmployeePortal onCreate={handleCreateTicket} onViewTickets={() => setView('my-tickets')} />
          ) : view === 'my-tickets' ? (
            <ITDashboard 
              tickets={tickets} 
              loading={loading}
              onUpdate={handleUpdateTicket}
              onAddComment={(id, text) => handleAddComment(id, text)}
              canManageTickets={false}
              selectedTicket={selectedTicket}
              setSelectedTicket={setSelectedTicket}
              title="Мои заявки"
            />
          ) : view === 'it' ? (
            <ITDashboard 
              tickets={tickets} 
              loading={loading}
              onUpdate={handleUpdateTicket}
              onAddComment={(id, text) => handleAddComment(id, text)}
              canManageTickets={canAccessIt}
              selectedTicket={selectedTicket}
              setSelectedTicket={setSelectedTicket}
              title="ИТ-Служба"
              onOpenAsset={openAssetInModule}
            />
          ) : view === 'assets' ? (
            <AssetsPage
              initialAssetId={assetsFocusId}
              onNavigateToTicket={(ticketId) => {
                setPendingTicketId(ticketId);
                setView('it');
              }}
            />
          ) : (
            <AdminDirectory />
          )}
        </AnimatePresence>
      </main>
    </div>
    </DepartmentsProvider>
  );
}

function EmployeePortal({ onCreate, onViewTickets }: { onCreate: (data: FormData) => Promise<boolean>; onViewTickets?: () => void }) {
  const { user } = useAuth();
  const employee = user?.employee;
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [assetId, setAssetId] = useState('');
  const [problemType, setProblemType] = useState('hardware');
  const showAssetPicker = ['hardware', 'peripherals', 'software'].includes(problemType);

  const resetFormFields = () => {
    setFiles([]);
    setAssetId('');
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!employee) return;
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);

    const ticketData = {
      problemType: formData.get('problemType'),
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority'),
      remoteAccess: formData.get('remoteAccess') === 'on',
      assetId: assetId || undefined,
    };

    const finalFormData = new FormData();
    finalFormData.append('ticket', JSON.stringify(ticketData));
    files.forEach((file) => finalFormData.append('files', file));

    const success = await onCreate(finalFormData);
    if (success) {
      setSubmitted(true);
    }
    setSubmitting(false);
  };

  if (!employee) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 card text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Профиль не настроен</h2>
        <p className="text-slate-600">
          Обратитесь к администратору организации для привязки вашей учётной записи к справочнику сотрудников.
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-20 text-center p-8 card">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Заявка успешно создана!</h2>
        <p className="text-slate-600 mb-8">Мы получили ваше обращение и скоро приступим к работе.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={() => { setSubmitted(false); resetFormFields(); }} className="btn btn-primary">Создать новую заявку</button>
          {onViewTickets && (
            <button type="button" onClick={onViewTickets} className="btn btn-secondary">Мои заявки</button>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto py-6 sm:py-10 px-4 sm:px-6 overflow-y-auto h-full safe-bottom"
    >
      <div className="mb-6 sm:mb-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Новая заявка в ИТ</h2>
        <p className="text-slate-500">Пожалуйста, заполните форму ниже, чтобы мы могли помочь вам быстрее.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 pb-20">
        {/* Section 1: Employee Data */}
        <section className="card p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <User className="text-blue-600 w-5 h-5" />
            <h3 className="font-semibold text-slate-800">Данные сотрудника</h3>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 space-y-3 border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Ваши данные</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-slate-500 block mb-0.5">Отдел</span>
                <span className="font-medium text-slate-800">{employee.department}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">ФИО</span>
                <span className="font-medium text-slate-800">{employee.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block mb-0.5">Телефон</span>
                <span className="font-medium text-slate-800">{employee.mobile || '—'}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Problem Details */}
        <section className="card p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
            <AlertCircle className="text-blue-600 w-5 h-5" />
            <h3 className="font-semibold text-slate-800">Характеристика проблемы</h3>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">Тип обращения *</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {PROBLEM_TYPES.map(type => {
                  const Icon = PROBLEM_TYPE_ICONS[type.id];
                  return (
                  <label key={type.id} className="relative flex items-start sm:items-center p-3 sm:p-4 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 min-w-0">
                    <input
                      type="radio"
                      name="problemType"
                      value={type.id}
                      required
                      className="sr-only"
                      checked={problemType === type.id}
                      onChange={() => setProblemType(type.id)}
                    />
                    <Icon className="w-5 h-5 text-slate-400 mr-3 shrink-0 mt-0.5 sm:mt-0" />
                    <span className="text-sm font-medium text-slate-700 leading-snug">
                      <span className="sm:hidden">{type.shortLabel}</span>
                      <span className="hidden sm:inline">{type.label}</span>
                    </span>
                  </label>
                  );
                })}
              </div>
            </div>

            {showAssetPicker && (
              <AssetPicker value={assetId} onChange={(id) => setAssetId(id)} />
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Краткое описание (заголовок) *</label>
              <input name="title" type="text" required placeholder="Например: Не работает принтер" className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Подробное описание проблемы *</label>
              <textarea 
                name="description" 
                required 
                rows={4} 
                className="input" 
                placeholder="Опишите, что произошло, когда началось и что вы уже пробовали сделать..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Приоритет *</label>
                <select name="priority" required className="input">
                  {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="flex items-start sm:items-center gap-3 sm:pt-6">
                <input type="checkbox" name="remoteAccess" id="remoteAccess" className="w-5 h-5 mt-0.5 sm:mt-0 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="remoteAccess" className="text-sm font-medium text-slate-700 leading-snug">Возможность удалённого доступа</label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Прикрепить файлы (скриншоты, логи)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              >
                <Paperclip className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 font-medium">Нажмите или перетащите файлы сюда</p>
                <p className="text-slate-400 text-sm mt-1">Макс. размер 10МБ на файл</p>
                <input 
                  type="file" 
                  multiple 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
              </div>
              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  {files.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-slate-400" />
                        <span className="text-sm text-slate-700 truncate max-w-xs">{file.name}</span>
                      </div>
                      <button type="button" onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="text-slate-400 hover:text-red-500">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4">
          <button type="button" className="btn btn-secondary w-full sm:w-auto">Отмена</button>
          <button type="submit" disabled={submitting} className="btn btn-primary w-full sm:w-auto sm:px-12 flex items-center justify-center gap-2">
            {submitting ? 'Отправка...' : (
              <>
                <Send className="w-4 h-4" />
                Отправить заявку
              </>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
}

function AdminDirectory() {
  const [section, setSection] = useState<'employees' | 'departments'>('employees');
  const { refresh: refreshDepartments } = useDepartments();
  const [list, setList] = useState<DirectoryEmployeeAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [dept, setDept] = useState('');
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('employee');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiFetch('/api/employees');
      if (r.ok) setList(await r.json());
      else setList([]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (section === 'employees') {
      load();
    }
  }, [section]);

  const cancelEdit = () => {
    setEditingId(null);
    setDept('');
    setFullName('');
    setMobile('');
    setEmail('');
    setPassword('');
    setUserRole('employee');
    setError('');
  };

  const save = async () => {
    if (!fullName.trim()) {
      setError('Укажите ФИО');
      return;
    }
    if (!dept.trim()) {
      setError('Выберите отдел');
      return;
    }
    if (!editingId && email && !password) {
      setError('Укажите пароль для новой учётной записи');
      return;
    }
    setError('');
    try {
      const body: Record<string, string> = { department: dept, fullName, mobile };
      if (email) body.email = email;
      if (password) body.password = password;
      if (userRole) body.role = userRole;

      const r = editingId
        ? await apiFetch(`/api/employees/${editingId}`, { method: 'PATCH', body: JSON.stringify(body) })
        : await apiFetch('/api/employees', { method: 'POST', body: JSON.stringify(body) });

      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        setError(err.error || 'Ошибка сохранения');
        return;
      }
      cancelEdit();
      await load();
    } catch (err) {
      console.error(err);
      setError('Ошибка сохранения');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Удалить запись из справочника?')) return;
    try {
      await apiFetch(`/api/employees/${id}`, { method: 'DELETE' });
      if (editingId === id) cancelEdit();
      await load();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (row: DirectoryEmployeeAdmin) => {
    setEditingId(row.id);
    setDept(row.department);
    setFullName(row.fullName);
    setMobile(row.mobile || '');
    setEmail(row.email ?? '');
    setPassword('');
    setUserRole(row.role ?? 'employee');
    setError('');
  };

  if (section === 'departments') {
    return (
      <div className="h-full flex flex-col min-h-0">
        <div className="px-4 sm:px-6 pt-4 shrink-0 max-w-5xl mx-auto w-full">
          <AdminSectionTabs section={section} onChange={setSection} />
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
          <DepartmentsDirectory
            onChanged={() => {
              refreshDepartments();
              load();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6 overflow-y-auto h-full safe-bottom"
    >
      <AdminSectionTabs section={section} onChange={setSection} className="mb-6" />
      <div className="mb-6 sm:mb-8 flex items-start gap-3 sm:gap-4">
        <div className="bg-blue-600 p-2.5 sm:p-3 rounded-xl shrink-0">
          <Users className="text-white w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Справочник сотрудников</h2>
          <p className="text-slate-500 mt-1">
            Добавляйте сотрудников и учётные записи для входа. Данные профиля подставляются в заявки автоматически.
          </p>
        </div>
      </div>

      <div className="card p-4 sm:p-6 space-y-6 mb-6 sm:mb-8">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">
          {editingId ? 'Редактирование записи' : 'Добавить сотрудника'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Отдел *</label>
            <DepartmentSelect value={dept} onChange={setDept} allowEmpty={!editingId} emptyLabel="Выберите отдел" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ФИО *</label>
            <input
              className="input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Иванов Иван Иванович"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Мобильный телефон</label>
            <input
              className="input"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="+7 (999) 000-00-00"
            />
          </div>
        </div>
        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-semibold text-slate-700 mb-3">Учётная запись для входа</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@company.ru"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {editingId ? 'Новый пароль (необяз.)' : 'Пароль'}
              </label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Роль</label>
              <select className="input" value={userRole} onChange={(e) => setUserRole(e.target.value as UserRole)}>
                <option value="employee">Сотрудник</option>
                <option value="it_agent">ИТ-специалист</option>
                <option value="org_admin">Администратор</option>
              </select>
            </div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={save} className="btn btn-primary inline-flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {editingId ? 'Сохранить' : 'Добавить'}
          </button>
          {editingId && (
            <button type="button" onClick={cancelEdit} className="btn btn-secondary">
              Отмена
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Текущие записи</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-500">Загрузка…</div>
        ) : list.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Записей пока нет</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {list.map((row) => (
                <div key={row.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{row.fullName}</p>
                      <p className="text-sm text-slate-600">{row.department}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => startEdit(row)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                        title="Изменить"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(row.id)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 space-y-1">
                    <p>Телефон: {row.mobile || '—'}</p>
                    <p>E-mail: {row.email ?? (row.hasLogin ? '—' : 'нет входа')}</p>
                    <p>Роль: {row.role ?? '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-slate-500">
                  <th className="px-6 py-3 font-medium">Отдел</th>
                  <th className="px-6 py-3 font-medium">ФИО</th>
                  <th className="px-6 py-3 font-medium">Телефон</th>
                  <th className="px-6 py-3 font-medium">E-mail</th>
                  <th className="px-6 py-3 font-medium">Роль</th>
                  <th className="px-6 py-3 font-medium w-32">Действия</th>
                </tr>
              </thead>
              <tbody>
                {list.map((row) => (
                  <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/80">
                    <td className="px-6 py-3 text-slate-800">{row.department}</td>
                    <td className="px-6 py-3 font-medium text-slate-900">{row.fullName}</td>
                    <td className="px-6 py-3 text-slate-600">{row.mobile || '—'}</td>
                    <td className="px-6 py-3 text-slate-600">{row.email ?? (row.hasLogin ? '—' : 'нет входа')}</td>
                    <td className="px-6 py-3 text-slate-600">{row.role ?? '—'}</td>
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(row)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          title="Изменить"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(row.id)}
                          className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}

function AdminSectionTabs({
  section,
  onChange,
  className = '',
}: {
  section: 'employees' | 'departments';
  onChange: (s: 'employees' | 'departments') => void;
  className?: string;
}) {
  return (
    <div className={`flex gap-1.5 overflow-x-auto scrollbar-hide ${className}`}>
      <button
        type="button"
        onClick={() => onChange('employees')}
        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          section === 'employees'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        Сотрудники
      </button>
      <button
        type="button"
        onClick={() => onChange('departments')}
        className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          section === 'departments'
            ? 'bg-blue-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        Отделы
      </button>
    </div>
  );
}

function ITDashboard({ 
  tickets, 
  loading, 
  onUpdate, 
  onAddComment,
  selectedTicket,
  setSelectedTicket,
  canManageTickets,
  title = 'Заявки',
  onOpenAsset,
}: { 
  tickets: Ticket[]; 
  loading: boolean;
  onUpdate: (id: string, updates: Partial<Ticket>) => Promise<void>;
  onAddComment: (id: string, text: string) => Promise<void>;
  selectedTicket: Ticket | null;
  setSelectedTicket: (t: Ticket | null) => void;
  canManageTickets: boolean;
  title?: string;
  onOpenAsset?: (assetId: string) => void;
}) {
  const [filter, setFilter] = useState<TicketStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  const filteredTickets = tickets
    .filter(t => filter === 'all' || t.status === filter)
    .filter(t => t.title.toLowerCase().includes(search.toLowerCase()) || t.requesterName.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return <div className="flex items-center justify-center h-full">Загрузка...</div>;
  }

  return (
    <div className="flex h-full min-h-0 bg-slate-50">
      {/* Sidebar / List */}
      <div className={`w-full md:w-1/3 md:min-w-0 md:max-w-md border-r border-slate-200 bg-white flex flex-col min-h-0 ${selectedTicket ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 sm:p-4 border-b border-slate-200 space-y-3 sm:space-y-4 shrink-0">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Поиск заявок..." 
              className="w-full rounded-lg border border-transparent bg-slate-50 py-2.5 pl-10 pr-3 text-base sm:text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5 md:flex-col md:overflow-visible md:pb-0">
            <button 
              type="button"
              onClick={() => setFilter('all')}
              className={`shrink-0 md:w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              Все
            </button>
            {STATUSES.map(s => (
              <button 
                type="button"
                key={s.value}
                onClick={() => setFilter(s.value)}
                className={`shrink-0 md:w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors whitespace-nowrap ${filter === s.value ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredTickets.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Заявки не найдены</div>
          ) : (
            filteredTickets.map(ticket => (
              <div 
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className={`p-4 border-b border-slate-100 cursor-pointer transition-colors hover:bg-slate-50 ${selectedTicket?.id === ticket.id ? 'bg-blue-50 border-l-4 border-l-blue-600' : ''}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${PRIORITIES.find(p => p.value === ticket.priority)?.color}`}>
                    {PRIORITIES.find(p => p.value === ticket.priority)?.label}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(ticket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h4 className="font-semibold text-slate-800 line-clamp-1 mb-1">{ticket.title}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{ticket.requesterName}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUSES.find(s => s.value === ticket.status)?.color}`}>
                    {STATUSES.find(s => s.value === ticket.status)?.label}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Details View */}
      <div className={`flex-1 min-w-0 flex flex-col bg-slate-50 min-h-0 ${!selectedTicket ? 'hidden md:flex items-center justify-center text-slate-400' : 'flex'}`}>
        {!selectedTicket ? (
          <div className="text-center">
            <TicketIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Выберите заявку для просмотра деталей</p>
          </div>
        ) : (
          <TicketDetails 
            ticket={selectedTicket} 
            onClose={() => setSelectedTicket(null)}
            onUpdate={onUpdate}
            onAddComment={onAddComment}
            canManageTickets={canManageTickets}
            onOpenAsset={onOpenAsset}
          />
        )}
      </div>
    </div>
  );
}

function TicketDetails({ 
  ticket, 
  onClose, 
  onUpdate, 
  onAddComment,
  canManageTickets,
  onOpenAsset,
}: { 
  ticket: Ticket; 
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Ticket>) => Promise<void>;
  onAddComment: (id: string, text: string) => Promise<void>;
  canManageTickets: boolean;
  onOpenAsset?: (assetId: string) => void;
}) {
  const [commentText, setCommentText] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showResolutionInput, setShowResolutionInput] = useState(false);
  const [resolutionText, setResolutionText] = useState('');

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (newStatus === 'resolved') {
      setShowResolutionInput(true);
    } else {
      setIsUpdating(true);
      await onUpdate(ticket.id, { status: newStatus });
      setIsUpdating(false);
    }
  };

  const submitResolution = async () => {
    if (!resolutionText.trim()) return;
    setIsUpdating(true);
    await onUpdate(ticket.id, { status: 'resolved', resolution: resolutionText });
    setShowResolutionInput(false);
    setIsUpdating(false);
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    await onAddComment(ticket.id, commentText);
    setCommentText('');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full min-h-0 flex flex-col bg-white"
    >
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 bg-white sticky top-0 z-10 shrink-0">
        <div className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1">
          <button type="button" onClick={onClose} className="md:hidden p-2 hover:bg-slate-100 rounded-lg shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${PRIORITIES.find(p => p.value === ticket.priority)?.color}`}>
                {PRIORITIES.find(p => p.value === ticket.priority)?.label}
              </span>
              <span className="text-xs text-slate-400">#{ticket.id.slice(0, 8)}</span>
            </div>
            <h3 className="font-bold text-slate-900 text-base sm:text-lg break-words">{ticket.title}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
          {canManageTickets && showResolutionInput ? (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50 p-2 sm:p-1 rounded-lg border border-slate-200 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Опишите решение..." 
                className="input py-2 sm:py-1 text-sm w-full sm:w-48"
                value={resolutionText}
                onChange={(e) => setResolutionText(e.target.value)}
              />
              <div className="flex gap-2">
                <button type="button" onClick={submitResolution} className="btn btn-primary py-2 sm:py-1 text-xs flex-1 sm:flex-none">OK</button>
                <button type="button" onClick={() => setShowResolutionInput(false)} className="p-2 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ) : canManageTickets ? (
            <select 
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
              disabled={isUpdating}
              className={`text-sm font-semibold px-3 py-2 sm:py-1.5 rounded-lg border-none focus:ring-2 ring-blue-500 cursor-pointer w-full sm:w-auto max-w-full ${STATUSES.find(s => s.value === ticket.status)?.color}`}
            >
              {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          ) : (
            <span className={`text-sm font-semibold px-3 py-2 sm:py-1.5 rounded-lg w-full sm:w-auto text-center ${STATUSES.find(s => s.value === ticket.status)?.color}`}>
              {STATUSES.find(s => s.value === ticket.status)?.label}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 sm:space-y-8 min-h-0 safe-bottom">
        {/* Info Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="flex flex-wrap items-stretch gap-3">
              {(() => {
                const type = PROBLEM_TYPES.find((t) => t.id === ticket.problemType);
                const Icon = PROBLEM_TYPE_ICONS[ticket.problemType] ?? TicketIcon;
                return (
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 min-w-[180px]">
                    <Icon className="w-4 h-4 text-slate-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wide">Тип обращения</p>
                      <p className="text-sm font-medium text-slate-800">
                        {(type?.shortLabel ?? type?.label ?? ticket.problemType) || '—'}
                      </p>
                    </div>
                  </div>
                );
              })()}
              {ticket.remoteAccess && (
                <div className="inline-flex items-center px-3 py-2 bg-blue-50 rounded-lg border border-blue-100 text-sm text-blue-800">
                  Возможен удалённый доступ
                </div>
              )}
            </section>

            <section>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Описание проблемы</h4>
              <div className="bg-slate-50 p-4 rounded-xl text-slate-700 whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </div>
            </section>

            <section>
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Вложенные файлы</h4>
              {ticket.files.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Файлы не прикреплены</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ticket.files.map((file, idx) => (
                    <a 
                      key={idx} 
                      href={ticketFileUrl(ticket.id, file)} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                    >
                      <div className="bg-blue-50 p-2 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{file.split('-').slice(2).join('-')}</p>
                        <p className="text-[10px] text-slate-400">Нажмите для просмотра</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            {canManageTickets && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">Журнал действий и комментарии</h4>
                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{ticket.internalComments.length}</span>
              </div>
              
              <div className="space-y-4">
                {ticket.internalComments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-slate-600 text-xs font-bold">
                      {comment.author[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-800">{comment.author}</span>
                        <span className="text-[10px] text-slate-400">{new Date(comment.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-2xl rounded-tl-none text-sm text-slate-700">
                        {comment.text}
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex gap-3 mt-6">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                    ИТ
                  </div>
                  <div className="flex-1 space-y-3">
                    <textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Добавить комментарий..."
                      className="input min-h-[100px]"
                    />
                    <div className="flex justify-end">
                      <button onClick={submitComment} className="btn btn-primary flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Отправить
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </section>
            )}
          </div>

          <div className="space-y-8">
            {ticket.linkedAsset && (
              <LinkedAssetCard
                asset={ticket.linkedAsset}
                onOpenInAssets={onOpenAsset}
              />
            )}
            <section className="card p-4 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Информация о заявителе</h4>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500 shrink-0">ФИО:</span>
                  <span className="text-xs font-semibold text-slate-800 break-words text-left sm:text-right">{ticket.requesterName}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500 shrink-0">Отдел:</span>
                  <span className="text-xs font-semibold text-slate-800 break-words text-left sm:text-right">{ticket.department}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500 shrink-0">Локация:</span>
                  <span className="text-xs font-semibold text-slate-800 break-words text-left sm:text-right">{ticket.location || '—'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2 border-b border-slate-50">
                  <span className="text-xs text-slate-500 shrink-0">E-mail:</span>
                  <span className="text-xs font-semibold text-slate-800 break-all text-left sm:text-right">{ticket.contactInfo.email || '—'}</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 py-2">
                  <span className="text-xs text-slate-500 shrink-0">Телефон:</span>
                  <span className="text-xs font-semibold text-slate-800 break-words text-left sm:text-right">{[ticket.contactInfo.phone, ticket.contactInfo.mobile].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>
            </section>

            {ticket.status === 'resolved' && (
              <section className="card p-4 bg-green-50 border-green-100 space-y-2">
                <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider">Решение</h4>
                <p className="text-sm text-green-800">{ticket.resolution || 'Проблема устранена.'}</p>
              </section>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
