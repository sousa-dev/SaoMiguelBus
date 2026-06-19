/** Line label for directions copy — i18n strings already prefix "Linha"/"Line". */
export function directionsLineLabel(leg: {
  line_code: string;
  line_name: string | null;
}): string {
  const name = leg.line_name?.trim();
  if (!name) {
    return leg.line_code;
  }
  return name.replace(/^linha\s+/i, '');
}
