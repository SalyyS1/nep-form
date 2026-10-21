// Existing local demo chart. Replace with supplier measurements before real sales.
export const SHIRT_SIZE_CHART = [
  { size: 'S', height: [150, 160], weight: [42, 52] },
  { size: 'M', height: [160, 170], weight: [50, 62] },
  { size: 'L', height: [168, 178], weight: [60, 72] },
  { size: 'XL', height: [175, 185], weight: [70, 85] },
];
export function suggestShirtSize(height, weight, sizes) {
  if (!Number.isFinite(height) || !Number.isFinite(weight) || height < 100 || height > 230 || weight < 20 || weight > 250) return { size: null, reason: 'Nhập chiều cao và cân nặng hợp lệ (cm, kg).', kind: 'invalid' };
  if (height < 150 || height > 185 || weight < 42 || weight > 85) return { size: null, reason: 'Số đo nằm ngoài bảng size tham khảo hiện tại. Bạn nên đối chiếu số đo áo hoặc nhờ shop tư vấn.', kind: 'outside' };
  // A larger requirement in either dimension takes precedence; never squeeze into a smaller available size.
  const heightIndex = SHIRT_SIZE_CHART.findIndex(row => height <= row.height[1]);
  const weightIndex = SHIRT_SIZE_CHART.findIndex(row => weight <= row.weight[1]);
  const index = Math.max(heightIndex, weightIndex), row = SHIRT_SIZE_CHART[index];
  if (!sizes.includes(row.size)) return { size: null, reason: `Số đo gần size ${row.size}, nhưng mẫu này không có size đó. Bạn nên nhờ shop kiểm tra số đo áo.`, kind: 'unavailable' };
  const different = Math.abs(heightIndex - weightIndex) >= 2;
  return { size: row.size, reason: different ? 'Chiều cao và cân nặng lệch nhiều hàng trong bảng. Gợi ý ưu tiên số đo cần size lớn hơn; nên kiểm tra chiều dài và vòng ngực áo.' : 'Gợi ý theo chiều cao và cân nặng trong bảng size tham khảo của Nếp.', kind: different ? 'check' : 'match' };
}
