export interface IPlayerColor {
  bg: string;
  border: string;
  badge: string;
}

export const PLAYER_COLORS: Record<number, IPlayerColor> = {
  1: {
    bg: 'bg-sky-500/15',
    border: 'border-sky-400/40',
    badge: 'bg-sky-500/30 border-sky-300/50 text-sky-100',
  },
  2: {
    bg: 'bg-emerald-500/15',
    border: 'border-emerald-400/40',
    badge: 'bg-emerald-500/30 border-emerald-300/50 text-emerald-100',
  },
  3: {
    bg: 'bg-amber-500/15',
    border: 'border-amber-400/40',
    badge: 'bg-amber-500/30 border-amber-300/50 text-amber-100',
  },
  4: {
    bg: 'bg-rose-500/15',
    border: 'border-rose-400/40',
    badge: 'bg-rose-500/30 border-rose-300/50 text-rose-100',
  },
  5: {
    bg: 'bg-violet-500/15',
    border: 'border-violet-400/40',
    badge: 'bg-violet-500/30 border-violet-300/50 text-violet-100',
  },
};
