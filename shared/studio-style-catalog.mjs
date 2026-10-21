export const STUDIO_STYLES = [
  { id: 'minimal', label: 'Tối giản', color: '#4f5a40' },
  { id: 'street', label: 'Đường phố', color: '#302a42' },
  { id: 'retro', label: 'Retro', color: '#9a482e' },
  { id: 'cute', label: 'Dễ thương', color: '#9b475c' },
  { id: 'nature', label: 'Thiên nhiên', color: '#36634e' },
  { id: 'travel', label: 'Du lịch', color: '#34596d' },
];
export function matchesStudioSearch(item, query, style) {
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase();
  return (!style || item.style === style) && normalize(`${item.name} ${item.tags || ''} ${STUDIO_STYLES.find(value => value.id === item.style)?.label || ''}`).includes(normalize(query.trim()));
}
