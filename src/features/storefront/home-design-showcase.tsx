import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { renderShirtSvg, svgDataUrl } from '../../../shared/custom-core.mjs';
import { useBuiltinDesignFonts } from '../studio/use-builtin-design-fonts';
import { homeTemplateFontProject, homeTemplateProject, homeTemplates, shirtColors } from './home-designs';
import { useHomePlayback } from './use-home-playback';
import '../../styles/home-design-showcase.css';

export function HomeDesignShowcase() {
  const [index, setIndex] = useState(0);
  const playback = useHomePlayback();
  const fonts = useBuiltinDesignFonts(homeTemplateFontProject);
  const template = homeTemplates[index];
  const previews = useMemo(() => {
    // The first template uses the core UI font, so both garments exist while other fonts load.
    if (fonts.loading || fonts.error) return null;
    return homeTemplates.map(item => {
      const project = homeTemplateProject(item.id);
      return { front: svgDataUrl(renderShirtSvg(project, shirtColors[0].hex, 'front')), back: svgDataUrl(renderShirtSvg(project, shirtColors[0].hex, 'back')) };
    });
  }, [fonts.loading, fonts.error]);
  const initial = useMemo(() => {
    const project = homeTemplateProject('own');
    return { front: svgDataUrl(renderShirtSvg(project, shirtColors[0].hex, 'front')), back: svgDataUrl(renderShirtSvg(project, shirtColors[0].hex, 'back')) };
  }, []);
  const ready = previews !== null;
  const playing = playback.playing && ready;
  const selected = ready ? template : homeTemplates[0];
  const scenes = previews ? homeTemplates.map((item, position) => ({ ...item, images: previews[position] })) : [{ ...homeTemplates[0], images: initial }];
  const motionLabel = playback.paused ? 'Tự động đổi mẫu áo' : 'Dừng đổi mẫu áo';
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => setIndex(value => (value + 1) % homeTemplates.length), 3800);
    return () => window.clearInterval(timer);
  }, [playing]);
  return <section ref={playback.ref} className="home-design-showcase" id="cach-tao-ao" aria-labelledby="home-design-title" data-template={selected.id} data-playing={playing} data-motion="true">
    <div className="container home-design-layout">
      <div className="home-design-heading">
        <p className="eyebrow">THỬ MẪU THIẾT KẾ TRÊN ÁO</p>
        <h2 id="home-design-title">Xem mẫu in<br /><em>ở cả hai mặt áo.</em></h2>
        <p>Cùng một mẫu, hai khổ in để bạn so sánh. Trong Studio, bạn có thể thiết kế riêng từng mặt.</p>
        <Link className="button custom-primary" to="/thiet-ke"><span>Tự thiết kế áo</span><ArrowUpRight size={20} /></Link>
        <p className="home-design-library-note">Các mẫu có trong thư viện Studio.<br />Chọn mẫu rồi sửa thành chiếc áo của bạn.</p>
      </div>
      <div className="home-design-visual">
        <div className="home-design-stage">
          {scenes.map(scene => <div className={`home-design-scene ${scene.id === selected.id ? 'is-active' : ''}`} data-scene={scene.id} aria-hidden={scene.id !== selected.id} key={scene.id}>
            <figure className="home-design-face home-design-front"><div><img src={scene.images.front} width="600" height="680" alt={`Mặt trước áo kem — mẫu ${scene.name}`} decoding="async" /></div><figcaption><span>01 / MẶT TRƯỚC</span><span>Khổ in vừa</span></figcaption></figure>
            <figure className="home-design-face home-design-back"><div><img src={scene.images.back} width="600" height="680" alt={`Mặt sau áo kem — mẫu ${scene.name}`} decoding="async" /></div><figcaption><span>02 / MẶT SAU</span><span>Khổ in lớn</span></figcaption></figure>
          </div>)}
        </div>
        <div className="home-design-caption">
          <div className="home-design-current"><h3>{selected.name}</h3><span>{selected.styleName}</span></div>
          <div className="home-design-controls">
            <span className="home-design-counter">{String(index + 1).padStart(2, '0')} / {String(homeTemplates.length).padStart(2, '0')}</span>
            <button className="home-motion-toggle" type="button" disabled={!ready} aria-pressed={playback.paused} aria-label={motionLabel} onClick={() => playback.setPaused(!playback.paused)}>{playback.paused ? <Play size={15} /> : <Pause size={15} />}<span>{playback.paused ? 'Tự đổi mẫu' : 'Tạm dừng'}</span></button>
          </div>
        </div>
        <div className="home-design-progress" aria-hidden="true">{homeTemplates.map((item, position) => <span key={item.id} className={position === index ? 'is-current' : ''} />)}</div>
        {fonts.error && <p className="home-design-font-error" role="status">Chưa tải được phông cho các mẫu khác. Tải lại trang để xem tiếp nhé.</p>}
      </div>
    </div>
  </section>;
}
