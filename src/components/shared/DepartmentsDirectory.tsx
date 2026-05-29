import { useState } from 'react';
import { motion } from 'motion/react';
import { Building2, Plus, Trash2, Pencil } from 'lucide-react';
import { apiFetch } from '../../lib/api';
import type { Department } from '../../types';
import { useDepartments } from '../../context/DepartmentsContext';

export function DepartmentsDirectory({ onChanged }: { onChanged?: () => void }) {
  const { departments, loading, refresh } = useDepartments();
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setError('');
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch('/api/departments', {
        method: 'POST',
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка создания');
        return;
      }
      setName('');
      await refresh();
      onChanged?.();
    } catch {
      setError('Ошибка создания');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiFetch(`/api/departments/${editingId}`, {
        method: 'PATCH',
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка сохранения');
        return;
      }
      cancelEdit();
      await refresh();
      onChanged?.();
    } catch {
      setError('Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setError('');
  };

  const handleDelete = async (dept: Department) => {
    if (!confirm(`Удалить отдел «${dept.name}»?`)) return;
    setError('');
    try {
      const res = await apiFetch(`/api/departments/${dept.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error || 'Ошибка удаления');
        return;
      }
      if (editingId === dept.id) cancelEdit();
      await refresh();
      onChanged?.();
    } catch {
      setError('Ошибка удаления');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6 overflow-y-auto h-full safe-bottom"
    >
      <div className="mb-6 sm:mb-8 flex items-start gap-3 sm:gap-4">
        <div className="bg-blue-600 p-2.5 sm:p-3 rounded-xl shrink-0">
          <Building2 className="text-white w-6 h-6 sm:w-7 sm:h-7" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Справочник отделов</h2>
          <p className="text-slate-500 mt-1">
            Отделы используются при добавлении сотрудников и в карточках активов. При переименовании
            обновляются связанные записи. Удалить можно только неиспользуемый отдел.
          </p>
        </div>
      </div>

      <div className="card p-4 sm:p-6 space-y-4 mb-6 sm:mb-8">
        <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-3">
          {editingId ? 'Редактирование отдела' : 'Новый отдел'}
        </h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            className="input flex-1"
            value={editingId ? editName : name}
            onChange={(e) => (editingId ? setEditName(e.target.value) : setName(e.target.value))}
            placeholder="Название отдела"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                editingId ? handleSaveEdit() : handleCreate();
              }
            }}
          />
          {editingId ? (
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={submitting || !editName.trim()}
                className="btn btn-primary flex-1 sm:flex-none"
              >
                {submitting ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button type="button" onClick={cancelEdit} className="btn btn-secondary flex-1 sm:flex-none">
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting || !name.trim()}
              className="btn btn-primary inline-flex items-center justify-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              {submitting ? 'Добавление...' : 'Добавить'}
            </button>
          )}
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 sm:px-6 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Текущие отделы</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-slate-500">Загрузка…</div>
        ) : departments.length === 0 ? (
          <div className="p-12 text-center text-slate-400">Отделов пока нет</div>
        ) : (
          <>
            <div className="md:hidden divide-y divide-slate-100">
              {departments.map((dept) => (
                <div key={dept.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900">{dept.name}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(dept.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(dept)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                      title="Изменить"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(dept)}
                      className="p-2 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-slate-500">
                    <th className="px-6 py-3 font-medium">Название</th>
                    <th className="px-6 py-3 font-medium">Создан</th>
                    <th className="px-6 py-3 font-medium w-32">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map((dept) => (
                    <tr
                      key={dept.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/80 ${
                        editingId === dept.id ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      <td className="px-6 py-3 font-medium text-slate-900">{dept.name}</td>
                      <td className="px-6 py-3 text-slate-500">
                        {new Date(dept.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(dept)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                            title="Изменить"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(dept)}
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
