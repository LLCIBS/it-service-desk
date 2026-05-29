import type { AssetStatus } from '../../types';

const STATUS_LABELS: Record<AssetStatus, { label: string; color: string }> = {
  in_use: { label: 'В работе', color: 'bg-green-100 text-green-700' },
  spare: { label: 'На складе', color: 'bg-blue-100 text-blue-700' },
  repair: { label: 'В ремонте', color: 'bg-orange-100 text-orange-700' },
  decommissioned: { label: 'Списано', color: 'bg-gray-100 text-gray-600' },
};

export function StatusBadge({ status }: { status: AssetStatus }) {
  const s = STATUS_LABELS[status] ?? STATUS_LABELS.in_use;
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.color}`}>
      {s.label}
    </span>
  );
}
