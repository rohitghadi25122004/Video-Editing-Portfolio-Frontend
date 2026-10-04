/**
 * Tiny contract between components that want to open the player (hero,
 * work grid) and the player that owns the dialog (src/components/player).
 * The opener passes the element that triggered it so focus can return.
 */
export const PLAYER_OPEN_EVENT = "vg:player-open";

export type PlayerOpenDetail = {
  itemId: string;
  trigger: HTMLElement | null;
};

export function openPlayer(itemId: string, trigger: HTMLElement | null = null) {
  window.dispatchEvent(
    new CustomEvent<PlayerOpenDetail>(PLAYER_OPEN_EVENT, { detail: { itemId, trigger } }),
  );
}
