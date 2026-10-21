export async function downloadArtwork(designId: string, side: 'front' | 'back') {
  const response = await fetch(`/api/custom/designs/${encodeURIComponent(designId)}/artwork/${side}`, { credentials: 'same-origin' });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'Chưa tải được file thiết kế. Vui lòng thử lại.');
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `nep-${designId}-${side}.svg`; link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
