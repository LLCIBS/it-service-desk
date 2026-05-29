import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export function HomePage() {
  const [slug, setSlug] = useState('demo');
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <div className="card p-8 max-w-md w-full">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-600 p-2 rounded-lg">
            <LayoutDashboard className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">IT Service Desk</h1>
        </div>
        <p className="text-slate-600 mb-6">Введите код вашей организации для входа.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (slug.trim()) navigate(`/o/${slug.trim()}/login`);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Код организации</label>
            <input
              className="input w-full"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="demo"
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-full">
            Перейти к входу
          </button>
        </form>
      </div>
    </div>
  );
}
