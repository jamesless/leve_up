import { useState } from 'react';
import { ICard } from '@/types';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';

interface DiscardDialogProps {
  bottomCards: ICard[];
  onSubmit: (cardIndices: number[]) => void;
  isPending: boolean;
}

export default function DiscardDialog({ bottomCards, onSubmit, isPending }: DiscardDialogProps) {
  const { selectedCardIndices, toggleCard, clearSelection } = useGameStore();
  const [showBottomCards, setShowBottomCards] = useState(false);

  const handleSubmit = () => {
    if (selectedCardIndices.size === 7) {
      onSubmit(Array.from(selectedCardIndices));
      clearSelection();
    }
  };

  return (
    <div className="mb-4 w-full rounded-xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-950/95 via-amber-900/95 to-amber-950/95 p-4 shadow-2xl">
      <h2 className="mb-3 text-center text-xl font-bold text-amber-400">
        扣底牌
      </h2>

      <div className="mb-3 rounded-lg border border-amber-700/30 bg-amber-950/30 p-3">
        <p className="text-center text-sm text-amber-200">
          你获得了庄家位置！请从手牌中选择<span className="font-bold text-amber-400"> 7 张牌</span>扣除作为底牌。
        </p>
        <p className="mt-2 text-center text-sm text-amber-300/70">
          已选择: <span className="font-bold text-amber-400">{selectedCardIndices.size}</span> / 7 张
        </p>
      </div>

      {bottomCards && bottomCards.length > 0 && (
        <div className="mb-3">
          <button
            onClick={() => setShowBottomCards(!showBottomCards)}
            className="w-full rounded-lg border border-amber-700/50 bg-amber-900/20 px-3 py-1.5 text-sm text-amber-300 transition-colors hover:bg-amber-900/40"
          >
            {showBottomCards ? '隐藏' : '查看'}底牌 ({bottomCards.length}张)
          </button>

          {showBottomCards && (
            <div className="mt-2 flex flex-wrap gap-1.5 rounded-lg border border-amber-700/30 bg-amber-950/20 p-2">
              {bottomCards.map((card, i) => (
                <div
                  key={i}
                  className="flex h-10 w-8 items-center justify-center rounded border border-amber-600 bg-amber-50 text-xs font-bold shadow-md"
                >
                  <span className={card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-slate-900'}>
                    {card.value}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-3 rounded-lg border border-amber-700/30 bg-amber-950/20 p-2 text-center text-xs text-amber-300/80">
        💡 提示：点击下方手牌选择要扣除的牌。扣除的牌将在游戏结束时计分。
      </div>

      <div className="flex justify-center gap-3">
        <Button
          variant="game"
          size="lg"
          onClick={handleSubmit}
          disabled={selectedCardIndices.size !== 7 || isPending}
          className="px-8"
        >
          {isPending ? '提交中...' : `确认扣牌 (${selectedCardIndices.size}/7)`}
        </Button>
      </div>
    </div>
  );
}
