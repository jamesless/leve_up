import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';

interface CallDealerDialogProps {
  onSubmit: (cardIndices: number[]) => void;
  isPending: boolean;
  currentLevel?: string;
}

export default function CallDealerDialog({ onSubmit, isPending, currentLevel = '2' }: CallDealerDialogProps) {
  const { selectedCardIndices, clearSelection } = useGameStore();

  const handleSubmit = () => {
    if (selectedCardIndices.size === 0) return;
    onSubmit(Array.from(selectedCardIndices));
  };

  const canSubmit = selectedCardIndices.size > 0;

  return (
    <div className="rounded-xl border border-purple-400/30 bg-purple-950/40 p-5 backdrop-blur-md shadow-[0_4px_24px_rgba(139,92,246,0.2)]">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white/90">选择级牌叫庄</h3>
        <p className="mt-1 text-sm text-white/50">
          请从手牌中选择 {currentLevel} 级牌进行叫庄，花色将自动确定
        </p>
      </div>

      {/* 选牌提示 */}
      <div className="mb-4 rounded-lg glass-card p-3 border border-white/15">
        <p className="text-sm text-white/80">
          <span className="font-semibold">已选择 {selectedCardIndices.size} 张牌</span>
        </p>
        {selectedCardIndices.size === 0 && (
          <p className="mt-1 text-xs text-white/40">
            请点击手牌中的 {currentLevel} 进行选择
          </p>
        )}
        {selectedCardIndices.size > 0 && (
          <p className="mt-1 text-xs text-white/50">
            选择更多同花色级牌可以增加叫庄优先级
          </p>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={clearSelection}
          disabled={isPending}
          className="text-white/60 hover:text-white/90 hover:bg-white/10"
        >
          清空选择
        </Button>
        <Button
          variant="game"
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
        >
          {isPending ? '提交中...' : '确认叫庄'}
        </Button>
      </div>
    </div>
  );
}
