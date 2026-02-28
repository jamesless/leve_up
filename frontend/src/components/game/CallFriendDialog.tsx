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
  [ECardSuit.JOKER]: '🃏 王',
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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-8 max-w-lg w-full border-2 border-amber-400/30">
        {/* 标题 */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent mb-2">
            🤝 叫朋友
          </h2>
          <p className="text-sm text-gray-600">选择一张牌，打出该牌的玩家将成为您的盟友</p>
        </div>

        <div className="space-y-6">
          {/* 选择花色 */}
          {!isJokerSelected && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm">
              <label className="block text-base font-semibold mb-3 text-gray-800">🎴 选择花色</label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(SUIT_LABELS).map(([suit, label]) => (
                  <button
                    key={suit}
                    onClick={() => setSelectedSuit(suit as ECardSuit)}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 font-semibold shadow-sm hover:shadow-md ${
                      selectedSuit === suit
                        ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg scale-105'
                        : 'border-gray-300 bg-white hover:border-amber-300 hover:scale-102'
                    }`}
                    disabled={isPending}
                  >
                    <span className={`text-2xl ${suit === ECardSuit.HEARTS || suit === ECardSuit.DIAMONDS ? 'text-red-600' : 'text-gray-800'}`}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 选择牌值 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm">
            <label className="block text-base font-semibold mb-3 text-gray-800">🃏 选择牌值</label>
            <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
              {availableValues.map((value) => (
                <button
                  key={value}
                  onClick={() => setSelectedValue(value)}
                  className={`p-3 rounded-lg border-2 transition-all duration-200 font-bold shadow-sm hover:shadow-md ${
                    selectedValue === value
                      ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg scale-110 text-amber-800'
                      : 'border-gray-300 bg-white hover:border-amber-300 hover:scale-105 text-gray-700'
                  }`}
                  disabled={isPending}
                >
                  <span className="text-sm">{VALUE_LABELS[value] || value}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 选择位置 */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-gray-200 shadow-sm">
            <label className="block text-base font-semibold mb-3 text-gray-800">🎯 叫第几张</label>
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((pos) => (
                <button
                  key={pos}
                  onClick={() => setSelectedPosition(pos)}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 font-bold shadow-sm hover:shadow-md ${
                    selectedPosition === pos
                      ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-amber-100 shadow-lg scale-105 text-amber-800'
                      : 'border-gray-300 bg-white hover:border-amber-300 hover:scale-102 text-gray-700'
                  }`}
                  disabled={isPending}
                >
                  第 {pos} 张
                </button>
              ))}
            </div>
          </div>

          {/* 当前选择提示 - 改进对比度 */}
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-xl shadow-lg">
            <p className="text-white font-semibold text-base">
              ✨ 当前选择：叫 {isJokerSelected ? (
                <span className="font-bold text-yellow-200 underline decoration-2">{VALUE_LABELS[selectedValue]}</span>
              ) : (
                <span className="font-bold text-yellow-200 underline decoration-2">{SUIT_LABELS[selectedSuit]} {selectedValue}</span>
              )}（第 {selectedPosition} 张）
            </p>
            <p className="text-amber-100 mt-2 text-sm">
              💡 打出该牌的第 {selectedPosition} 张的玩家将成为您的盟友，与您组队对抗其他玩家。
            </p>
          </div>

          {/* 提交按钮 */}
          <Button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-6 text-lg font-bold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? '⏳ 提交中...' : '✅ 确认叫朋友'}
          </Button>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #fbbf24;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #f59e0b;
        }
      `}</style>
    </div>
  );
}
