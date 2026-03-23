import { useState } from 'react';
import { ECardSuit, type ICard } from '@/types';
import { Button } from '@/components/ui/button';
import PlayingCard from './PlayingCard';

interface CallFriendDialogProps {
  onSubmit: (suit: ECardSuit, value: string, position: number) => void;
  isPending: boolean;
  currentLevel: string;
  playerHand: ICard[];
}

const SUIT_LABELS: Record<string, string> = {
  [ECardSuit.SPADES]: '♠',
  [ECardSuit.HEARTS]: '♥',
  [ECardSuit.DIAMONDS]: '♦',
  [ECardSuit.CLUBS]: '♣',
  [ECardSuit.JOKER]: '🃏',
};

const ALL_VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'small', 'big'];

const VALUE_LABELS: Record<string, string> = {
  'small': '小王',
  'big': '大王',
};

export default function CallFriendDialog({ onSubmit, isPending, currentLevel, playerHand }: CallFriendDialogProps) {
  const [selectedSuit, setSelectedSuit] = useState<ECardSuit>(ECardSuit.SPADES);
  const [selectedValue, setSelectedValue] = useState<string>('A');
  const [selectedPosition, setSelectedPosition] = useState<number>(1);
  const [showHand, setShowHand] = useState(false);

  // 牌的排序函数：红黑交错排序（黑桃→红桃→梅花→方片→大小王）
  const sortCards = (cards: ICard[]): ICard[] => {
    const suitOrder: Record<string, number> = {
      [ECardSuit.SPADES]: 0,   // 黑桃 - 黑色
      [ECardSuit.HEARTS]: 1,   // 红桃 - 红色
      [ECardSuit.CLUBS]: 2,    // 梅花 - 黑色
      [ECardSuit.DIAMONDS]: 3,  // 方片 - 红色
      [ECardSuit.JOKER]: 4,     // 大小王
    };
    const valueOrder: Record<string, number> = {
      '2': 0, '3': 1, '4': 2, '5': 3, '6': 4, '7': 5, '8': 6, '9': 7, '10': 8,
      'J': 9, 'Q': 10, 'K': 11, 'A': 12, 'small': 13, 'big': 14,
    };

    return [...cards].sort((a, b) => {
      const suitDiff = suitOrder[a.suit] - suitOrder[b.suit];
      if (suitDiff !== 0) return suitDiff;
      // 从大到小排列
      return valueOrder[b.value] - valueOrder[a.value];
    });
  };

  const sortedHand = sortCards(playerHand || []);

  // 过滤掉当前级别的牌
  const availableValues = ALL_VALUES.filter(v => v !== currentLevel);

  // 检查是否选择了大小王
  const isJokerSelected = selectedValue === 'small' || selectedValue === 'big';

  const handleSubmit = () => {
    // 如果选择了大小王，使用 joker 作为花色
    const suit = isJokerSelected ? ECardSuit.JOKER : selectedSuit;
    onSubmit(suit, selectedValue, selectedPosition);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-5 max-w-sm w-full border-2 border-amber-400/30 my-4 max-h-[85vh] overflow-y-auto">
        {/* 标题 */}
        <div className="text-center mb-3">
          <h2 className="text-xl font-bold text-amber-600">
            叫朋友
          </h2>
          <p className="text-xs text-gray-500 mt-1">选择一张牌作为盟友标识</p>
        </div>

        {/* 查看手牌按钮 */}
        <button
          onClick={() => setShowHand(!showHand)}
          className="w-full mb-3 py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {showHand ? '隐藏手牌' : '查看手牌'}
        </button>

        {/* 手牌展示区域 */}
        {showHand && (
          <div className="mb-3 p-2 bg-green-50 rounded-lg border border-green-200">
            <p className="text-xs text-green-700 mb-2 font-medium">您的手牌（已理好）</p>
            <div className="flex flex-wrap justify-center gap-1">
              {sortedHand.map((card, index) => (
                <PlayingCard
                  key={`${card.suit}-${card.value}-${index}`}
                  card={card}
                  size="sm"
                />
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {/* 选择花色 */}
          {!isJokerSelected && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <label className="block text-xs font-semibold mb-2 text-gray-700">选择花色</label>
              <div className="grid grid-cols-4 gap-2">
                {[ECardSuit.SPADES, ECardSuit.HEARTS, ECardSuit.DIAMONDS, ECardSuit.CLUBS].map((suit) => (
                  <button
                    key={suit}
                    onClick={() => setSelectedSuit(suit)}
                    className={`p-2 rounded-lg border-2 text-lg font-bold transition-all ${
                      selectedSuit === suit
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-300 bg-white hover:border-amber-300'
                    }`}
                    disabled={isPending}
                  >
                    <span className={suit === ECardSuit.HEARTS || suit === ECardSuit.DIAMONDS ? 'text-red-600' : 'text-gray-800'}>
                      {SUIT_LABELS[suit]}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 选择牌值 */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <label className="block text-xs font-semibold mb-2 text-gray-700">选择牌值</label>
            <div className="grid grid-cols-5 gap-1 max-h-24 overflow-y-auto">
              {availableValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedValue(value)}
                  className={`p-1.5 rounded border text-xs font-bold transition-all ${
                    selectedValue === value
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                  disabled={isPending}
                >
                  {VALUE_LABELS[value] || value}
                </button>
              ))}
            </div>
          </div>

          {/* 选择位置 */}
          <div className="bg-white rounded-lg p-3 border border-gray-200">
            <label className="block text-xs font-semibold mb-2 text-gray-700">第几张</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={`p-2 rounded-lg border-2 text-sm font-bold transition-all ${
                    selectedPosition === pos
                      ? 'border-amber-500 bg-amber-50 text-amber-800'
                      : 'border-gray-300 bg-white text-gray-700'
                  }`}
                  disabled={isPending}
                >
                  第{pos}张
                </button>
              ))}
            </div>
          </div>

          {/* 当前选择 */}
          <div className="bg-amber-500 p-2 rounded-lg text-center">
            <p className="text-white text-sm font-medium">
              {isJokerSelected ? VALUE_LABELS[selectedValue] : `${SUIT_LABELS[selectedSuit]}${selectedValue}`} (第{selectedPosition}张)
            </p>
          </div>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-2 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isPending ? '提交中...' : '确认'}
          </Button>
        </div>
      </div>
    </div>
  );
}
