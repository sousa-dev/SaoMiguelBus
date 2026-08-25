import { HopOnHopOffSheet } from '@/features/hop-on-hop-off/components/HopOnHopOffSheet';
import { useHopOnOffModalStore } from '@/features/hop-on-hop-off/lib/modal-store';

/** Single app-root host for the hop-on-hop-off promo sheet. */
export function HopOnHopOffSheetHost() {
  const open = useHopOnOffModalStore((s) => s.open);
  const source = useHopOnOffModalStore((s) => s.source);
  const close = useHopOnOffModalStore((s) => s.closeHopOnHopOffSheet);

  return <HopOnHopOffSheet visible={open} source={source} onClose={close} />;
}
