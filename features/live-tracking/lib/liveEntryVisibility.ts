/**
 * Should a live-tracking entry point be on screen, and should it respond?
 *
 * Takes a resolved boolean rather than a health payload, because the two
 * operators disagree about what "available" looks like on the wire (minibus
 * answers `{available}`, azoresbus answers `{status}` and signals an outage with
 * a 502). Normalising that is each operator's job; the visibility RULE is shared.
 *
 * The asymmetry between the two functions is deliberate: offline still SHOWS the
 * entry, greyed, because a control that vanishes when you lose signal reads as a
 * feature that was taken away. An upstream outage hides it entirely, because
 * there is nothing behind it to offer.
 */

export function shouldShowLiveEntry(isOnline: boolean, available: boolean): boolean {
  return available || !isOnline;
}

export function isLiveEntryEnabled(isOnline: boolean, available: boolean): boolean {
  return isOnline && available;
}
