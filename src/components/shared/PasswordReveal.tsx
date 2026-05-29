import { useState } from 'react';
import { Eye, EyeOff, Copy } from 'lucide-react';
import { apiFetch } from '../../lib/api';

export function PasswordReveal({
  revealUrl,
  masked = '••••••••',
}: {
  revealUrl: string;
  masked?: string;
}) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  const reveal = async () => {
    if (visible) {
      setVisible(false);
      setValue('');
      return;
    }
    setLoading(true);
    try {
      const res = await apiFetch(revealUrl);
      if (res.ok) {
        const data = await res.json();
        setValue(data.password ?? data.licenseKey ?? '');
        setVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (value) await navigator.clipboard.writeText(value);
  };

  return (
    <div className="flex items-center gap-2">
      <code className="text-sm bg-slate-100 px-2 py-1 rounded flex-1 truncate">
        {visible ? value : masked}
      </code>
      <button
        type="button"
        onClick={reveal}
        disabled={loading}
        className="p-1.5 hover:bg-slate-100 rounded text-slate-600"
        title={visible ? 'Скрыть' : 'Показать'}
      >
        {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
      {visible && (
        <button type="button" onClick={copy} className="p-1.5 hover:bg-slate-100 rounded text-slate-600" title="Копировать">
          <Copy className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
