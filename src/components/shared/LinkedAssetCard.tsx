import { Monitor, ExternalLink } from 'lucide-react';
import type { LinkedAsset } from '../../types';

const TYPE_LABELS: Record<string, string> = {
  computer: 'Компьютер',
  peripheral: 'Периферия',
  network: 'Сеть',
  other: 'Прочее',
};

export function LinkedAssetCard({
  asset,
  onOpenInAssets,
}: {
  asset: LinkedAsset;
  onOpenInAssets?: (assetId: string) => void;
}) {
  return (
    <section className="card p-4 space-y-3 border-blue-100 bg-blue-50/50">
      <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider flex items-center gap-2">
        <Monitor className="w-4 h-4" />
        Связанное оборудование
      </h4>
      <div className="space-y-1">
        <p className="font-semibold text-slate-800">{asset.name}</p>
        <p className="text-xs text-slate-600">
          {TYPE_LABELS[asset.assetType] ?? asset.assetType}
          {asset.inventoryNumber && ` · Инв. № ${asset.inventoryNumber}`}
        </p>
      </div>
      {onOpenInAssets && (
        <button
          type="button"
          onClick={() => onOpenInAssets(asset.id)}
          className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Открыть в ИТ-Активах
        </button>
      )}
    </section>
  );
}
