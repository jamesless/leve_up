import { create } from 'zustand';

interface IGameUIState {
  selectedCardIndices: Set<number>;
  toggleCard: (index: number) => void;
  clearSelection: () => void;
  selectAll: () => void;
  cardCount: number;
  setCardCount: (count: number) => void;
}

export const useGameStore = create<IGameUIState>((set, get) => ({
  selectedCardIndices: new Set(),
  cardCount: 0,

  toggleCard: (index) => {
    const next = new Set(get().selectedCardIndices);
    if (next.has(index)) {
      next.delete(index);
    } else {
      next.add(index);
    }
    set({ selectedCardIndices: next });
  },

  clearSelection: () => set({ selectedCardIndices: new Set() }),

  selectAll: () => {
    const count = get().cardCount;
    const all = new Set(Array.from({ length: count }, (_, i) => i));
    set({ selectedCardIndices: all });
  },

  setCardCount: (count) => set({ cardCount: count }),
}));
