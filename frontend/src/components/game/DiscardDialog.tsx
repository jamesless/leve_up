import { ICard, ECardSuit } from '@/types';
import { Button } from '@/components/ui/button';
import { useGameStore } from '@/store/gameStore';
import PlayingCard from '@/components/game/PlayingCard';
import { cn } from '@/lib/utils';
import { getSuitSymbol } from '@/lib/card';

interface DiscardDialogProps {
  bottomCards: ICard[];
  onSubmit: (cardIndices: number[]) => void;
  isPending: boolean;
  /** 嵌入模式：贴在父容器内部（如牌垫），自身充满 inset-0；不滚动 */
  embedded?: boolean;
  /** 翻底定庄 / 主色：用于在扣底牌界面顶部展示级牌 */
  trumpSuit?: ECardSuit | null;
  /** 级牌点数（如 "2" / "K" / "Big" 等） */
  trumpRank?: string;
  /** 庄家座位号 */
  dealerSeat?: number;
  /** 当前玩家手牌：用于在底牌下方预览"准备扣掉"的 7 张牌 */
  myHand?: ICard[];
}

export default function DiscardDialog({
  bottomCards,
  onSubmit,
  isPending,
  embedded = false,
  trumpSuit,
  trumpRank,
  dealerSeat,
  myHand,
}: DiscardDialogProps) {
  const { selectedCardIndices, clearSelection } = useGameStore();

  const handleSubmit = () => {
    if (selectedCardIndices.size === 7) {
      onSubmit(Array.from(selectedCardIndices));
      clearSelection();
    }
  };

  const rootClass = embedded
    ? 'absolute inset-0 z-30 flex flex-col justify-between gap-2 rounded-xl border border-purple-400/30 bg-purple-950/70 p-2 sm:p-3 backdrop-blur-md shadow-[0_4px_32px_rgba(139,92,246,0.25)] overflow-hidden'
    : 'mb-4 w-full rounded-xl border border-purple-400/30 bg-purple-950/50 p-5 backdrop-blur-md shadow-[0_4px_32px_rgba(139,92,246,0.25)]';

  const hasTrumpInfo = !!trumpSuit && !!trumpRank;
  const trumpSuitSymbol = trumpSuit ? getSuitSymbol(trumpSuit) : '';
  const isRedTrump = trumpSuit === ECardSuit.HEARTS || trumpSuit === ECardSuit.DIAMONDS;

  return (
    <div className={rootClass}>
      {/* 顶部信息条：级牌（PlayingCard）+ 庄家 + 主色 + 选牌进度，全部一行内显示 */}
      <div className="flex items-center justify-center gap-2 sm:gap-3 rounded-lg glass-card border border-amber-300/30 bg-amber-900/20 px-2 py-1.5 shrink-0">
        {hasTrumpInfo && (
          <PlayingCard
            card={{ suit: trumpSuit as ECardSuit, value: trumpRank as ICard['value'] }}
            size="xs"
            isTrumpRank
          />
        )}
        <div className="flex flex-col text-[10px] sm:text-xs leading-tight text-white/80">
          {hasTrumpInfo ? (
            <>
              <span>
                <span className="font-bold text-amber-200">翻底定庄</span>
                {dealerSeat != null && (
                  <> · 座位 <span className="font-bold text-amber-300">{dealerSeat}</span> 当庄</>
                )}
              </span>
              <span>
                主色 <span className={cn('font-bold', isRedTrump ? 'text-red-400' : 'text-slate-100')}>{trumpSuitSymbol}</span>
                <span className="ml-1">· 级数 <span className="font-bold text-amber-300">{trumpRank}</span></span>
              </span>
            </>
          ) : (
            <span className="font-bold text-white/85">扣底牌</span>
          )}
        </div>
        <div className="ml-auto text-[10px] sm:text-xs text-white/70">
          已选 <span className="font-bold text-purple-300">{selectedCardIndices.size}</span>/7
        </div>
      </div>

      {/* 中部：底牌（原始 7 张）+ 准备扣掉的 7 张牌（从手牌中选中），上下两行 */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center gap-2">
        {/* 第一行：底牌 7 张 */}
        {bottomCards && bottomCards.length > 0 && (
          <div className="flex w-full flex-col items-center gap-1">
            <div className="text-[10px] sm:text-xs text-amber-200/80 leading-tight">
              底牌 <span className="text-white/60">({bottomCards.length})</span>
            </div>
            <div className="flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5">
              {bottomCards.map((card, i) => (
                <PlayingCard
                  key={i}
                  card={card}
                  size="sm"
                  isTrumpRank={!!trumpRank && card.value === trumpRank}
                />
              ))}
            </div>
          </div>
        )}

        {/* 第二行：准备扣掉的牌（按选中顺序，从手牌中提取）。不足 7 张时用占位虚框补齐到 7 个槽位 */}
        <div className="flex w-full flex-col items-center gap-1">
          <div className="text-[10px] sm:text-xs text-purple-200/80 leading-tight">
            准备扣掉 <span className="text-white/60">({selectedCardIndices.size}/7)</span>
          </div>
          <div className="flex flex-nowrap items-center justify-center gap-1 sm:gap-1.5">
            {(() => {
              const selectedIdxArr = Array.from(selectedCardIndices);
              const selectedCards: ICard[] = myHand
                ? selectedIdxArr
                    .map((idx) => myHand[idx])
                    .filter((c): c is ICard => !!c)
                : [];
              const slots: (ICard | null)[] = [];
              for (let i = 0; i < 7; i++) {
                slots.push(selectedCards[i] ?? null);
              }
              return slots.map((card, i) =>
                card ? (
                  <PlayingCard
                    key={`sel-${i}`}
                    card={card}
                    size="sm"
                    isTrumpRank={!!trumpRank && card.value === trumpRank}
                  />
                ) : (
                  <div
                    key={`slot-${i}`}
                    className="w-10 h-14 rounded-md border border-dashed border-white/15 bg-white/[0.03]"
                    aria-label="待选牌位"
                  />
                ),
              );
            })()}
          </div>
        </div>
      </div>

      {/* 底部：单行提示 + 确认按钮 */}
      <div className="flex items-center justify-between gap-2 shrink-0">
        <p className="text-[10px] sm:text-xs text-white/55 leading-tight">
          💡 从手牌选 7 张扣除（结算时计分）
        </p>
        <Button
          variant="game"
          size="sm"
          onClick={handleSubmit}
          disabled={selectedCardIndices.size !== 7 || isPending}
          className="px-4 shrink-0"
        >
          {isPending ? '提交中...' : `确认扣牌 (${selectedCardIndices.size}/7)`}
        </Button>
      </div>
    </div>
  );
}
