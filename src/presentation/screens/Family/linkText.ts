import type { LinkState } from '../../../state/useFamilyStore'

export const LINK_TEXT: Record<LinkState, string> = {
  online: 'Connected — changes sync right away',
  connecting: 'Connecting…',
  offline: 'Offline — changes are saved here and sync when you reconnect',
}
