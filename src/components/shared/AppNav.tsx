import { LayoutDashboard, LogOut, User } from 'lucide-react';

export type AppView = 'employee' | 'my-tickets' | 'it' | 'admin' | 'assets';

const VIEW_LABELS: Record<AppView, string> = {
  employee: 'Новая заявка',
  'my-tickets': 'Мои заявки',
  it: 'ИТ-Служба',
  assets: 'ИТ-Активы',
  admin: 'Админ',
};

export function AppNav({
  view,
  setView,
  organizationName,
  userLabel,
  canAccessIt,
  canAccessAdmin,
  canCreateTickets = true,
  onLogout,
  onOpenAssets,
}: {
  view: AppView;
  setView: (v: AppView) => void;
  organizationName?: string;
  userLabel: string;
  canAccessIt: boolean;
  canAccessAdmin: boolean;
  canCreateTickets?: boolean;
  onLogout: () => void;
  onOpenAssets?: () => void;
}) {
  const tabs: { id: AppView; show: boolean; onClick?: () => void }[] = [
    { id: 'employee', show: canCreateTickets },
    { id: 'my-tickets', show: canCreateTickets && !canAccessIt },
    { id: 'it', show: canAccessIt },
    { id: 'assets', show: canAccessIt, onClick: onOpenAssets },
    { id: 'admin', show: canAccessAdmin },
  ];

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shrink-0">
      <div className="px-3 sm:px-6 py-3 flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg shrink-0">
            <LayoutDashboard className="text-white w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-bold text-slate-800 tracking-tight truncate">
              IT Service Desk
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500 truncate">{organizationName}</p>
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 max-w-[140px] md:max-w-[200px]">
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 shrink-0">
              <User className="w-4 h-4" />
            </div>
            <span className="text-sm font-medium text-slate-700 truncate">{userLabel}</span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="btn btn-secondary text-sm flex items-center gap-1 px-2 sm:px-4 py-2 min-h-[40px]"
            title="Выйти"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>
      </div>

      <div className="px-3 sm:px-6 pb-3 overflow-x-auto scrollbar-hide -mx-0">
        <div className="flex gap-1.5 min-w-max sm:min-w-0 sm:flex-wrap">
          {tabs
            .filter((t) => t.show)
            .map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  t.onClick?.();
                  setView(t.id);
                }}
                className={`whitespace-nowrap px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all min-h-[36px] ${
                  view === t.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {VIEW_LABELS[t.id]}
              </button>
            ))}
        </div>
      </div>
    </nav>
  );
}
