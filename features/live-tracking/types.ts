/**
 * Structural types shared by every live-tracking operator.
 *
 * PDL Mini Bus and AzoresBus are the same AVL vendor (Eleven Systems) behind
 * different base URLs, so their payloads share a vocabulary: the same status
 * words, the same `circulations` stop list, the same `{lat, lon}`. These types
 * describe only that common shape.
 *
 * They are deliberately structural rather than a shared nominal type: the
 * operator-specific interfaces in `lib/types.ts` stay independent and are simply
 * assignable to these, so neither operator's wire format is constrained by the
 * other's. Widen a field here only if BOTH feeds really do send it that way.
 */

export type LivePosition = {
  lat: number;
  lon: number;
};

export type LiveCirculationStage = {
  id?: string;
  name?: string;
  nameShort?: string;
  /**
   * A display name resolved upstream against our own stop table. AzoresBus
   * sends it; minibus does not, which is why it is optional and why callers
   * fall back to formatting `name` themselves.
   */
  canonicalName?: string;
  /** Our stop id, when the operator's stop could be matched to one. */
  stopId?: number | null;
  position?: LivePosition;
};

export type LiveCirculation = {
  sequence: number;
  stage?: LiveCirculationStage;
  /** Absent for stops already passed -- that means "behind us", not "unknown". */
  dueInMinutes?: number | null;
};

/** The minimum a vehicle needs to be drawn on a map. */
export type LiveVehicleLike = {
  id: string;
  position?: LivePosition;
};

/** A stop as the live map layers consume it, whatever produced it. */
export type LiveMapStop = {
  key: string;
  sequence: number;
  name_pt: string;
  match_key: string;
  interchange_key: string;
  interchange_lines: string[];
  latitude: number;
  longitude: number;
};
