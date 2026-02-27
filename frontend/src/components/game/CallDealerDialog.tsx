import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ECardSuit } from '@/types/card';
import { useGameStore } from '@/store/gameStore';

const SUITS: { suit: ECardSuit; label: string; color: string }[] = [
  { suit: ECardSuit.SPADES, label: '♠', color: 'text-slate-900' },
  { suit: ECardSuit.HEARTS, label: '♥', color: 'text-red-600' },
  { suit: ECardSuit.DIAMONDS, label: '♦', color: 'text-red-600' },
  { suit: ECardSuit.CLUBS, label: '♣', color: 'text-slate-900' },
];

interface CallDealerDialogProps {
  onSubmit: (suit: ECardSuit, cardIndices: number[]) => void;
  isPending: boolean;
}

export default function CallDealerDialog({ onSubmit, isPending }: CallDealerDialogProps) {
  const { selectedCardIndices, clearSelection } = useGameStore();
  const [selectedSuit, setSelectedSuit] = useState<ECardSuit | null>(null);

  const handleSubmit = () => {
    if (!selectedSuit || selectedCardIndices.size === 0) return;
    onSubmit(selectedSuit, Array.from(selectedCardIndices));
  };

  const canSubmit = selectedSuit !== null && selectedCardIndices.size > 0;

  return (
    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-950/30 p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-amber-100">选择叫庄花色</h3>
        <p className="mt-1 text-sm text-amber-200/70">选择花色和底牌来叫庄</p>
      </div>

      {/* 花色选择 */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-amber-100">花色</label>
        <div className="grid grid-cols-4 gap-3">
          {SUITS.map(({ suit, label, color }) => (
            <button
              key={suit}
              onClick={() => setSelectedSuit(suit)}
              disabled={isPending}
              className={`
                flex h-16 items-center justify-center rounded-lg border-2 text-3xl font-bold transition-all
                ${
                  selectedSuit === suit
                    ? 'border-amber-500 bg-amber-500/20 shadow-lg shadow-amber-500/30'
                    : 'border-amber-900/50 bg-amber-900/20 hover:border-amber-700/50 hover:bg-amber-900/30'
                }
                ${isPending ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                ${color}
              `}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 选牌提示 */}
      <div className="mb-4 rounded-md bg-amber-900/20 p-3">
        <p className="text-sm text-amber-200">
          <span className="font-semibold">已选择 {selectedCardIndices.size} 张牌</span>
          {selectedCardIndices.size > 0 && (
            <span className="ml-2 text-amber-300/70">(用于叫庄的底牌)</span>
          )}
        </p>
        {selectedCardIndices.size === 0 && (
          <p className="mt-1 text-xs text-amber-300/50">请从手牌中选择要作为底牌的牌</p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          disabled={isPending}
          className="text-amber-200 hover:text-amber-100"
        >
          清空选择
        </Button>
        <div className="flex gap-2">
          {selectedSuit && (
            <Badge variant="outline" className="border-amber-500/50 text-amber-200">
              已选: {SUITS.find((s) => s.suit === selectedSuit)?.label}
            </Badge>
          )}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isPending}
            className="bg-amber-600 text-white hover:bg-amber-700"
          >
            {isPending ? '提交中...' : '确认叫庄'}
          </Button>
        </div>
      </div>
    </div>
  );
}
