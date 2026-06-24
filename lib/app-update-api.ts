export function buildAppUpdateCheckPath(params: { platform: 'ios' | 'android'; version: string }): string {
  const query = new URLSearchParams({ platform: params.platform, version: params.version });
  return `/api/v3/app/update-check?${query.toString()}`;
}
