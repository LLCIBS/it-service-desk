import { ArrowLeft } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export function SuperAdminBanner() {
  const { organization, exitOrganization } = useAuth();
  const navigate = useNavigate();

  const handleExit = async () => {
    await exitOrganization();
    navigate('/platform');
  };

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-3 sm:px-6 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shrink-0">
      <p className="text-sm text-amber-900">
        <span className="font-semibold">Режим управления:</span> {organization?.name}
        <span className="text-amber-700 ml-1">(/{organization?.slug})</span>
      </p>
      <button
        type="button"
        onClick={handleExit}
        className="btn btn-secondary text-sm inline-flex items-center gap-1 w-full sm:w-auto justify-center"
      >
        <ArrowLeft className="w-4 h-4" />
        Выйти из организации
      </button>
    </div>
  );
}
