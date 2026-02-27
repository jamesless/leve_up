import { useState } from 'react';
import { ECardSuit } from '@/types';
import { Button } from '@/components/ui/button';

interface CallFriendDialogProps {
  onSubmit: (suit: ECardSuit, value: string, position: number) => void;
  isPending: boolean;
  currentLevel: string;
}

const SUIT_LABELS = {
  [ECardSuit.SPADES]: '♠ 黑桃',
  [ECardSuit.HEARTS]: '♥ 红桃',
  [ECardSuit.DIAMONDS]: '♦ 方片',
  [ECardSuit.CLUBS]: '♣ 梅花',
};

const ALL_VALUES = ['A', 'K', 'Q', 'J', '10', '9', '8', '7', '6', '5', '4', '3', '2', 'small', 'big'];

const VALUE_LABELS: Record<string, string> = {
  'small': '小王',
  'big': '大王',
};

export default function CallFriendDialog({ onSubmit, isPending, currentLevel }: CallFriendDialogProps) {
  const [selectedSuit, setSelectedSuit] = useState<ECardSuit>(ECardSuit.SPADES);
  const [selectedValue, setSelectedValue] = useState<string>('A');
  const [selectedPosition, setSelectedPosition] = useState<number>(1);

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4 text-center">叫朋友</h2>

        <div className="space-y-6">
          {/* 选择花色 */}
          {!isJokerSelected && (
            <div>
              <label className="block text-sm font-medium mb-2">选择花色</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(SUIT_LABELS).map(([suit, label]) => (
                  <button
                    key={suit}
                    onClick={() => setSelectedSuit(suit as ECardSuit)}
                    className={`p-3 rounded border-2 transition-all ${
                      selectedSuit === suit
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    disabled={isPending}
                  >
                    <span className={`text-xl ${suit === ECardSuit.HEARTS || suit === ECardSuit.DIAMONDS ? 'text-red-600' : 'text-black'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 选择牌值 */}
          <div>
            <label className="block text-sm font-medium mb-2">选择牌值</label>
            <div className="grid grid-cols-6 gap-2 max-h-32 overflow-y-auto">
              {availableValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedValue(value)}
                  className={`p-2 rounded border-2 transition-all ${
                    selectedValue === value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={isPending}
                >
                  {VALUE_LABELS[value] || value}
                </button>
              ))}
            </div>
          </div>

          {/* 选择位置 */}
          <div>
            <label className="block text-sm font-medium mb-2">叫第几张</label>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={`p-3 rounded border-2 transition-all ${
                    selectedPosition === pos
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                  disabled={isPending}
                >
                  第 {pos} 张
                </button>
              ))}
            </div>
          </div>

          {/* 说明文字 */}
          <div className="bg-blue-50 p-3 rounded text-sm">
            <p className="text-gray-700">
              💡 当前选择：叫 {isJokerSelected ? (
                <span className="font-bold">{VALUE_LABELS[selectedValue]}</span>
              ) : (
                <span className="font-bold">{SUIT_LABELS[selectedSuit]} {selectedValue}</span>
              )}（第 {selectedPosition} 张）
            </p>
            <p className="text-gray-600 mt-2 text-xs">
              打出该牌的玩家将成为你的朋友，与你组队对抗其他玩家。
            </p>
          </div>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full"
          >
            {isPending ? '提交中...' : '确认叫朋友'}
          </Button>
        </div>
      </div>
    </div>
  );
}
