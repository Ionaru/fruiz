export function buildListenSrc(input: {
  id: string;
  playbackGainSourceSize: number | null;
  playbackGainSourceMtimeMs: number | null;
}): string {
  const { id, playbackGainSourceSize, playbackGainSourceMtimeMs } = input;
  if (playbackGainSourceSize === null || playbackGainSourceMtimeMs === null) {
    return `/api/listen/${id}`;
  }
  return `/api/listen/${id}?v=${playbackGainSourceSize}-${playbackGainSourceMtimeMs}`;
}
