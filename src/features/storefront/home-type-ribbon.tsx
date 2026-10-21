import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BUILTIN_FONTS } from '../../../shared/builtin-font-catalog.mjs';
import { useHomePlayback } from './use-home-playback';
import '../../styles/builtin-fonts.css';

export function HomeTypeRibbon() {
  const playback = useHomePlayback();
  return <section ref={playback.ref} className="home-type-ribbon" aria-label="15 phông chữ hỗ trợ tiếng Việt" data-playing={playback.playing} data-motion-allowed="true">
    <div className="container home-type-ribbon-heading"><div><span className="eyebrow">15 PHÔNG CHỮ CÓ DẤU.</span><p>Chọn kiểu bạn thích.</p></div><div className="home-type-actions"><button className="home-motion-toggle" type="button" onClick={() => playback.setPaused(!playback.paused)} aria-pressed={playback.paused} aria-label={playback.paused ? 'Chạy dải phông chữ' : 'Dừng dải phông chữ'}>{playback.paused ? <Play size={15} /> : <Pause size={15} />}<span>{playback.paused ? 'Chạy tiếp' : 'Tạm dừng'}</span></button><Link className="text-link" to="/thiet-ke">Thử chữ của bạn<ArrowUpRight size={17} /></Link></div></div>
    <div className="home-type-window"><div className="home-type-track">{[0, 1].map(copy => <div className="home-type-group" key={copy} aria-hidden={copy === 1 ? true : undefined}>{BUILTIN_FONTS.map(font => <div className="home-type-specimen" key={font.value} data-font={font.value}><span className="home-type-word" style={{ fontFamily: font.value.startsWith('builtin:') ? `nep-builtin-${font.value.slice(8)}` : font.value }}>Nét riêng của bạn.</span><span className="home-type-font-name">{font.label}<i aria-hidden="true">✳</i></span></div>)}</div>)}</div></div>
  </section>;
}
