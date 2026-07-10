import { useState, useEffect } from 'react';
import { ECardSuit } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CallFriendDialogProps {
  onSubmit: (suit: ECardSuit, value: string, position: number) => void;
  isPending: boolean;
  currentLevel: string;
  /** 嵌入模式：贴在父容器内部（如牌垫），自身充满 inset-0；不滚动 */
  embedded?: boolean;
}

/** 花色 / 大小王统一作为"花色"层选项 */
type SuitOption =
  | { kind: 'suit'; suit: ECardSuit; label: string; isRed?: boolean }
  | { kind: 'joker'; value: 'small' | 'big'; label: string };

const SUIT_OPTIONS: SuitOption[] = [
  { kind: 'suit', suit: ECardSuit.SPADES, label: '♠' },
  { kind: 'suit', suit: ECardSuit.HEARTS, label: '♥', isRed: true },
  { kind: 'suit', suit: ECardSuit.DIAMONDS, label: '♦', isRed: true },
  { kind: 'suit', suit: ECardSuit.CLUBS, label: '♣' },
  { kind: 'joker', value: 'small', label: '小王' },
  { kind: 'joker', value: 'big', label: '大王' },
];

const ALL_VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2'];

export default function CallFriendDialog({
  onSubmit,
  isPending,
  currentLevel,
  embedded = false,
}: CallFriendDialogProps) {
  // 当前选中的花色/大小王（默认♠）
  const [selectedSuitIdx, setSelectedSuitIdx] = useState<number>(0);
  const [selectedValue, setSelectedValue] = useState<string>('A');
  const [selectedPosition, setSelectedPosition] = useState<number>(1);

  const selectedOption = SUIT_OPTIONS[selectedSuitIdx];
  const isJokerSelected = selectedOption.kind === 'joker';

  // 若级牌恰好为当前选中牌值，自动切到下一个可用牌值
  const availableValues = ALL_VALUES.filter((v) => v !== currentLevel);
  useEffect(() => {
    if (!isJokerSelected && !availableValues.includes(selectedValue)) {
      setSelectedValue(availableValues[0] ?? 'A');
    }
  }, [isJokerSelected, availableValues, selectedValue]);

  const handleSubmit = () => {
    if (selectedOption.kind === 'joker') {
      // 大小王也支持叫第 2/3 张（3 副牌，每种大小王各有 3 张）
      onSubmit(ECardSuit.JOKER, selectedOption.value, selectedPosition);
    } else {
      onSubmit(selectedOption.suit, selectedValue, selectedPosition);
    }
  };

  const rootClass = embedded
    ? 'absolute inset-0 z-30 flex flex-col gap-1.5 rounded-xl border border-purple-400/30 bg-purple-950/70 p-2 sm:p-3 backdrop-blur-md shadow-[0_4px_32px_rgba(139,92,246,0.25)] overflow-hidden'
    : 'fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto';

  const innerClass = embedded
    ? 'flex flex-1 min-h-0 flex-col gap-1.5'
    : 'glass-card rounded-2xl shadow-[0_8px_40px_rgba(139,92,246,0.35)] p-5 max-w-sm w-full border border-white/20 my-4 max-h-[85vh] overflow-y-auto backdrop-blur-xl';

  // 当前选择的文字摘要（底部状态条）
  const summaryText = selectedOption.kind === 'joker'
    ? `${selectedOption.label} (第${selectedPosition}张)`
    : `${selectedOption.label}${selectedValue} (第${selectedPosition}张)`;

  return (
    <div className={rootClass}>
      <div className={innerClass}>
        {/* 顶部标题条 */}
        <div className="text-center shrink-0">
          <h2 className={cn('font-bold text-white/90', embedded ? 'text-sm sm:text-base leading-tight' : 'text-xl')}>叫朋友</h2>
          <p className={cn('text-white/40', embedded ? 'text-[9px] sm:text-[10px] leading-tight' : 'text-xs mt-1')}>
            选择一张牌作为盟友标识
          </p>
        </div>

        {/* 选项区域：嵌入模式下三段平铺、铺满剩余空间，不再出现滚动条 */}
        <div className={cn(embedded ? 'flex flex-1 min-h-0 flex-col gap-1.5' : 'space-y-3')}>
          {/* 选择花色（含 小王 / 大王） */}
          <div className={cn('glass-card rounded-lg border border-white/15 flex flex-col', embedded ? 'p-1.5 sm:p-2 flex-[0_0_auto]' : 'p-3')}>
            <label className={cn('block font-semibold text-white/60 shrink-0', embedded ? 'mb-1 text-[10px] sm:text-xs' : 'mb-2 text-xs')}>
              选择花色
            </label>
            <div className="grid grid-cols-6 gap-1 sm:gap-1.5">
              {SUIT_OPTIONS.map((opt, idx) => {
                const isSelected = idx === selectedSuitIdx;
                const isJokerOpt = opt.kind === 'joker';
                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedSuitIdx(idx)}
                    className={cn(
                      'rounded-lg sm:rounded-xl border-2 font-bold transition-all backdrop-blur-sm flex items-center justify-center',
                      embedded
                        ? (isJokerOpt ? 'py-1 text-[11px] sm:text-xs' : 'py-1 text-sm')
                        : (isJokerOpt ? 'p-2 text-sm' : 'p-2 text-lg'),
                      isSelected
                        ? 'border-purple-400 bg-purple-500/30 text-white shadow-lg shadow-purple-500/30'
                        : 'border-white/20 bg-white/10 text-white/80 hover:border-white/40 hover:bg-white/15',
                    )}
                    disabled={isPending}
                  >
                    {opt.kind === 'suit' ? (
                      <span className={opt.isRed ? 'text-red-400' : 'text-white'}>
                        {opt.label}
                      </span>
                    ) : (
                      <span className={opt.value === 'big' ? 'text-amber-300' : 'text-slate-200'}>
                        {opt.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 选择牌值：选中大小王时禁用（大小王本身就是确定的一张牌） */}
          <div
            className={cn(
              'glass-card rounded-lg border flex flex-col transition-opacity',
              isJokerSelected ? 'border-white/10 opacity-40' : 'border-white/15',
              embedded ? 'p-1.5 sm:p-2 flex-1 min-h-0' : 'p-3',
            )}
          >
            <label className={cn('block font-semibold text-white/60 shrink-0', embedded ? 'mb-1 text-[10px] sm:text-xs' : 'mb-2 text-xs')}>
              选择牌值{isJokerSelected ? ' (大小王无需选择)' : ''}
            </label>
            <div
              className={cn(
                'grid grid-cols-5 gap-1',
                embedded ? 'flex-1 min-h-0 grid-rows-3' : 'max-h-24 overflow-y-auto',
              )}
            >
              {availableValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedValue(value)}
                  className={cn(
                    'rounded-md sm:rounded-lg border font-bold transition-all backdrop-blur-sm flex items-center justify-center',
                    embedded ? 'min-h-0 text-[10px] sm:text-xs' : 'p-1.5 text-xs',
                    selectedValue === value && !isJokerSelected
                      ? 'border-purple-400 bg-purple-500/30 text-white/90'
                      : 'border-white/15 bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80',
                  )}
                  disabled={isPending || isJokerSelected}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {/* 选择位置：4 花色和大小王都支持叫第 1/2/3 张（3 副牌） */}
          <div
            className={cn(
              'glass-card rounded-lg border border-white/15 flex flex-col',
              embedded ? 'p-1.5 sm:p-2 flex-[0_0_auto]' : 'p-3',
            )}
          >
            <label className={cn('block font-semibold text-white/60 shrink-0', embedded ? 'mb-1 text-[10px] sm:text-xs' : 'mb-2 text-xs')}>
              第几张
            </label>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {[1, 2, 3].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={cn(
                    'rounded-lg sm:rounded-xl border-2 font-bold transition-all backdrop-blur-sm',
                    embedded ? 'py-1 text-[11px] sm:text-xs' : 'p-2 text-sm',
                    selectedPosition === pos
                      ? 'border-purple-400 bg-purple-500/30 text-white shadow-lg shadow-purple-500/20'
                      : 'border-white/20 bg-white/10 text-white/70 hover:border-white/40 hover:bg-white/15',
                  )}
                  disabled={isPending}
                >
                  第{pos}张
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 底部：当前选择 + 提交按钮 */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex-1 bg-gradient-to-r from-purple-600/60 to-fuchsia-600/60 px-2 py-1 rounded-lg sm:rounded-xl text-center border border-purple-400/30 backdrop-blur-sm shadow-lg shadow-purple-500/20">
            <p className={cn('text-white font-medium', embedded ? 'text-[11px] sm:text-xs' : 'text-sm')}>
              {summaryText}
            </p>
          </div>
          <Button
            variant="game"
            size={embedded ? 'sm' : 'lg'}
            onClick={handleSubmit}
            disabled={isPending}
            className={cn('shrink-0 font-bold', embedded ? 'px-4 text-xs' : 'px-6 py-2 text-sm')}
          >
            {isPending ? '提交中...' : '确认'}
          </Button>
        </div>
      </div>
    </div>
  );
}
