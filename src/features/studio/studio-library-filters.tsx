import { Search } from 'lucide-react';
import { STUDIO_STYLES } from '../../../shared/studio-style-catalog.mjs';

interface Props { query: string; style: string; onQuery: (value: string) => void; onStyle: (value: string) => void; label: string }
export function StudioLibraryFilters({ query, style, onQuery, onStyle, label }: Props) {
  return <><label className="studio-library-search"><Search size={16} /><input value={query} aria-label={label} placeholder="Tìm theo tên, phong cách…" onChange={event => onQuery(event.target.value)} /></label><div className="studio-style-filters" aria-label="Phong cách thiết kế"><button type="button" aria-pressed={!style} onClick={() => onStyle('')}>Tất cả</button>{STUDIO_STYLES.map(item => <button type="button" key={item.id} aria-pressed={style === item.id} onClick={() => onStyle(item.id)}>{item.label}</button>)}</div></>;
}
