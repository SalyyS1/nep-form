import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DesignListRecord } from '../../../shared/custom-types';
import { EmptyState, ErrorText } from '../../components/ui';
import { api, dateLabel } from '../../lib/api';
import { DesignThumbnails } from '../checkout/custom-design-details';

export function MyDesigns() {
  const [designs, setDesigns] = useState<DesignListRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const load = useCallback(async (offset = 0) => {
    setLoading(true); setError('');
    try {
      const result = await api<{ designs: DesignListRecord[]; hasMore: boolean; nextOffset: number | null }>(`/custom/designs?offset=${offset}&limit=12`);
      setDesigns(current => offset === 0 ? result.designs : [...current, ...result.designs.filter(design => !current.some(saved => saved.id === design.id))]);
      setHasMore(result.hasMore); setNextOffset(result.nextOffset);
    }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa tải được thiết kế của bạn.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  return <><div className="content-heading"><h2>Thiết kế của tôi</h2><Link className="button-secondary" to="/thiet-ke"><Plus size={16} />Thiết kế mới</Link></div><p className="muted">Mỗi lần lưu tạo một bản riêng để bạn có thể mở lại và tiếp tục chỉnh sửa.</p>{!designs.length && <ErrorText>{error}</ErrorText>}{error && !designs.length && <button className="button-secondary" onClick={() => void load()} disabled={loading}><RefreshCw size={15} />Thử tải lại</button>}{loading && !designs.length ? <p className="custom-design-loading" role="status">Đang tải thiết kế…</p> : designs.length ? <><div className="my-designs-grid">{[...designs].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)).map(design => <article className="saved-design-card" key={design.id}><DesignThumbnails designId={design.id} name={design.project.name} /><div className="saved-design-info"><h3>{design.project.name}</h3><p>{design.project.color} / {design.project.size}</p><small>Lưu ngày {dateLabel(design.createdAt)}</small><Link className="text-link" to={`/thiet-ke?ban-thiet-ke=${encodeURIComponent(design.id)}`}>Mở thiết kế<ArrowRight size={16} /></Link></div></article>)}</div><div className="my-designs-pagination"><ErrorText>{error}</ErrorText>{hasMore && nextOffset !== null && <button className="button-secondary" onClick={() => void load(nextOffset)} disabled={loading}>{loading ? 'Đang tải thêm…' : error ? 'Thử tải thêm thiết kế' : 'Xem thêm thiết kế'}</button>}{loading && <span role="status" className="field-help">Đang tải thêm thiết kế của bạn…</span>}</div></> : !error && <EmptyState title="Bạn chưa lưu thiết kế nào." text="Thêm chữ hoặc hình lên áo, rồi lưu để mở lại sau." to="/thiet-ke" action="Bắt đầu thiết kế" />}</>;
}
