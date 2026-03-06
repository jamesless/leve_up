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
    <div className="rounded-lg border-2 border-amber-500/50 bg-amber-950/30 p-6 backdrop-blur-sm">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-amber-100">选择级牌叫庄</h3>
        <p className="mt-1 text-sm text-amber-200/70">
          请从手牌中选择 {currentLevel} 级牌进行叫庄，花色将自动确定
        </p>
      </div>

      {/* 选牌提示 */}
      <div className="mb-4 rounded-md bg-amber-900/20 p-3">
        <p className="text-sm text-amber-200">
          <span className="font-semibold">已选择 {selectedCardIndices.size} 张牌</span>
        </p>
        {selectedCardIndices.size === 0 && (
          <p className="mt-1 text-xs text-amber-300/50">
            请点击手牌中的 {currentLevel} 进行选择
          </p>
        )}
        {selectedCardIndices.size > 0 && (
          <p className="mt-1 text-xs text-amber-300/70">
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
          className="text-amber-200 hover:text-amber-100"
        >
          清空选择
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit || isPending}
          className="bg-amber-600 text-white hover:bg-amber-700"
        >
          {isPending ? '提交中...' : '确认叫庄'}
        </Button>
      </div>
    </div>
  );
}
