import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUpRight, Check, MoveRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { renderShirtSvg, svgDataUrl } from '../../../shared/custom-core.mjs';
import type { DesignSide } from '../../../shared/custom-types';
import { ProductCard } from '../../components/product-card';
import { useStore } from '../../lib/store-context';
import { homeDesign, shirtColors } from './home-designs';
import { useHomeMotion } from './use-home-motion';
import { HomeTypeRibbon } from './home-type-ribbon';
import { HomeDesignShowcase } from './home-design-showcase';
import '../../styles/expressive-home.css';

export default function HomePage() {
  const { data } = useStore();
  const homeRef = useRef<HTMLDivElement>(null);
  const [colorIndex, setColorIndex] = useState(0);
  const [side, setSide] = useState<DesignSide>('front');
  const project = useMemo(() => homeDesign(colorIndex === 1), [colorIndex]);
  const heroFront = useMemo(() => svgDataUrl(renderShirtSvg(project, shirtColors[colorIndex].hex, 'front')), [project, colorIndex]);
  const heroBack = useMemo(() => svgDataUrl(renderShirtSvg(project, shirtColors[colorIndex].hex, 'back')), [project, colorIndex]);
  useHomeMotion(homeRef);
  const readywear = (data?.products ?? []).filter(product => !product.isCustomBase);
  return <div ref={homeRef} className="custom-home">
    <div className="home-scroll-meter" aria-hidden="true"><span /></div>
    <section className="custom-hero container" aria-labelledby="custom-hero-title">
      <div className="custom-hero-copy"><p className="eyebrow custom-kicker"><span className="custom-seam-mark" aria-hidden="true" />NẾP / XƯỞNG ÁO CỦA BẠN</p>
        <h1 id="custom-hero-title">Tự thiết kế áo.<br /><em>In theo ý bạn.</em></h1>
        <p className="custom-hero-description">Thêm chữ, hình hoặc ảnh lên áo.<br />Chọn màu, chỉnh bố cục rồi xem trước.</p>
        <Link className="button custom-primary" to="/thiet-ke"><span>Bắt đầu thiết kế</span><ArrowUpRight size={20} /></Link>
        <div className="custom-hero-foot"><span>Chọn áo · Thêm thiết kế · Đặt hàng</span><a href="#cach-tao-ao" aria-label="Cuộn xem chiếc áo được tạo nên"><ArrowDown size={19} /></a></div>
      </div>
      <div className="custom-hero-visual"><span className="custom-hero-side-note">THIẾT KẾ CẢ MẶT TRƯỚC VÀ MẶT SAU</span>
        <div className="custom-hero-stage"><div className="home-fabric-halo" aria-hidden="true"><i /><i /><i /></div><svg className="home-thread-path" viewBox="0 0 500 500" fill="none" aria-hidden="true"><path d="M-30 350C40 80 350 480 420 250S50 30 100 210 450 560 530 80" /></svg><span className="custom-hero-orbit" aria-hidden="true" /><div className="custom-hero-float"><div className="custom-hero-tilt"><div className={`custom-shirt-turn ${side === 'back' ? 'is-back' : ''}`}>
          <img className="custom-shirt-front" src={heroFront} alt={`Mặt trước áo ${shirtColors[colorIndex].name.toLowerCase()} in chữ chậm một nhịp`} width="600" height="680" fetchPriority="high" />
          <img className="custom-shirt-back" src={heroBack} alt={`Mặt sau áo ${shirtColors[colorIndex].name.toLowerCase()} in chữ Cứ là mình`} width="600" height="680" />
        </div></div></div><div className="home-print-fragment home-print-fragment-1" aria-hidden="true"><span>nét chữ / 01</span><strong>là mình.</strong></div><div className="home-print-fragment home-print-fragment-2" aria-hidden="true"><span>hội mình / 02</span><strong>NẾP CLUB</strong><i>✳</i></div><div className="home-print-fragment home-print-fragment-3" aria-hidden="true"><span>chậm một nhịp.</span><i>↗</i></div></div>
        <div className="custom-preview-controls"><div className="custom-swatches" role="group" aria-label="Thử màu áo">{shirtColors.map((color, index) => <button key={color.name} type="button" aria-label={`Thử màu ${color.name}`} aria-pressed={index === colorIndex} className={index === colorIndex ? 'selected' : ''} onClick={() => setColorIndex(index)}><span style={{ background: color.hex }}>{index === colorIndex && <Check size={12} style={{ color: index === 1 ? '#fff' : '#20201e' }} />}</span></button>)}<span>{shirtColors[colorIndex].name}</span></div><div className="custom-side-tabs" role="group" aria-label="Mặt áo xem thử">{([['front', 'Trước'], ['back', 'Sau']] as const).map(([value, label]) => <button key={value} type="button" aria-pressed={side === value} onClick={() => setSide(value)}>{label}</button>)}</div></div>
        <p className="custom-preview-caption">Đổi màu và lật áo để xem hai mặt<MoveRight size={18} /></p>
      </div>
    </section>
    <HomeTypeRibbon />
    <HomeDesignShowcase />
    <section className="container custom-process" aria-labelledby="custom-process-title"><div className="custom-process-heading"><p className="eyebrow">CÁCH THIẾT KẾ ÁO</p><h2 id="custom-process-title">Thêm chữ, thêm hình.<br />Chỉnh cho vừa ý.</h2><Link className="text-link" to="/thiet-ke">Ghé Nếp Studio<ArrowUpRight size={18} /></Link></div><div className="custom-process-rows">{[
      ['01', 'Thêm chữ bạn thích.', 'Tên hội bạn, một câu cửa miệng. Chọn phông, đổi màu, chỉnh to nhỏ cho vừa ý.'],
      ['02', 'Chọn hình hoặc tải ảnh.', 'Chọn hình có sẵn hoặc tải ảnh, logo của bạn. Kéo, xoay, xếp từng lớp đến khi thấy ưng.'],
      ['03', 'Xem trước rồi đặt áo.', 'Xem cả hai mặt và phí in ngay trong Studio. Nếp nhận thiết kế cùng đơn hàng của bạn.'],
    ].map(([number, title, text]) => <article className="custom-process-row" key={number}><span className="custom-process-line" /><span className="custom-process-number">{number}</span><div><h3>{title}</h3><p>{text}</p></div><ArrowUpRight size={22} aria-hidden="true" /></article>)}</div></section>
    <section className="custom-editorial"><div className="custom-editorial-photo"><img src="/images/story-editorial.webp" alt="Cảm hứng trang phục unisex, tự nhiên mỗi ngày" width="933" height="1400" loading="lazy" /></div><div className="custom-editorial-copy"><p className="eyebrow">IN ĐIỀU BẠN THÍCH</p><h2>Áo cho bạn.<br /><em>Cho cả hội mình.</em></h2><p>Tên hội bạn, logo cửa hàng<br />hay một hình tự vẽ.<br />Đưa lên áo, mặc cùng nhau.</p><Link className="button custom-primary" to="/thiet-ke"><span>Tạo chiếc áo của bạn</span><ArrowUpRight size={20} /></Link></div></section>
    <section className="section container custom-readywear" id="hang-moi"><div className="section-heading"><div><p className="eyebrow">MẪU CÓ SẴN</p><h2>Chọn mẫu bạn thích.</h2></div><Link className="text-link" to="/cua-hang">Xem mẫu có sẵn<ArrowRight size={17} /></Link></div><div className="product-grid">{readywear.slice(0, 4).map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}</div></section>
  </div>;
}
