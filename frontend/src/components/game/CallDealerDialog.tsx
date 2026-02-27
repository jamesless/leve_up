import { ECardSuit } from '@/types';

interface CallDealerDialogProps {
  onSubmit: (suit: ECardSuit, cardIndices: number[]) => void;
  isPending: boolean;
}

export default function CallDealerDialog(_props: CallDealerDialogProps) {
  return null;
}
