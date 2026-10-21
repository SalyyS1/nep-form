import { useRef, type PointerEvent } from 'react';
import { PRINT_REGIONS, renderShirtSvg, svgDataUrl } from '../../../shared/custom-core.mjs';
import type { DesignLayer, DesignProject, DesignSide } from '../../../shared/custom-types';

interface Props {
  project: DesignProject; side: DesignSide; color: string; selectedId: string | null; zoom: number; guides: boolean;
  select: (id: string | null) => void; onPreview: (layer: DesignLayer) => void; onDragStart: () => void; onDragEnd: () => void;
}
export function StudioCanvas({ project, side, color, selectedId, zoom, guides, select, onPreview, onDragStart, onDragEnd }: Props) {
  const drag = useRef<{ layer: DesignLayer; x: number; y: number; mode: 'move' | 'resize' } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const face = project.faces[side]; const region = PRINT_REGIONS[face.area];
  function pointerPoint(event: PointerEvent<SVGSVGElement>) {
    const rectangle = event.currentTarget.getBoundingClientRect();
    return { x: (event.clientX - rectangle.left) * 600 / rectangle.width * 300 / region.width, y: (event.clientY - rectangle.top) * 680 / rectangle.height * 360 / region.height };
  }
  function start(event: PointerEvent<SVGGElement>, layer: DesignLayer, mode: 'move' | 'resize') {
    event.preventDefault(); event.stopPropagation(); select(layer.id);
    if (layer.locked || event.button !== 0) return;
    const rect = svgRef.current!.getBoundingClientRect();
    const point = { x: (event.clientX - rect.left) * 600 / rect.width * 300 / region.width, y: (event.clientY - rect.top) * 680 / rect.height * 360 / region.height };
    drag.current = { layer: { ...layer }, ...point, mode }; onDragStart(); svgRef.current!.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<SVGSVGElement>) {
    const state = drag.current; if (!state) return;
    const point = pointerPoint(event); const dx = point.x - state.x, dy = point.y - state.y;
    if (state.mode === 'move') onPreview({ ...state.layer, x: Math.round(Math.max(0, Math.min(300 - state.layer.width, state.layer.x + dx))), y: Math.round(Math.max(0, Math.min(360 - state.layer.height, state.layer.y + dy))) });
    else {
      const ratio = state.layer.width / state.layer.height;
      const width = Math.max(20, Math.min(300 - state.layer.x, (360 - state.layer.y) * ratio, state.layer.width + Math.max(dx, dy * ratio)));
      onPreview({ ...state.layer, width: Math.round(width), height: Math.round(width / ratio) });
    }
  }
  function end() { if (drag.current) { drag.current = null; onDragEnd(); } }
  return <div className="studio-artboard" style={{ width: `${zoom}%` }}>
    <img src={svgDataUrl(renderShirtSvg(project, color, side))} alt={`Bản xem trước ${side === 'front' ? 'mặt trước' : 'mặt sau'} áo ${project.name}`} draggable={false} />
    <svg ref={svgRef} className="studio-hit-canvas" viewBox="0 0 600 680" aria-label="Vùng chỉnh sửa thiết kế" onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onPointerDown={() => select(null)}>
      <g transform={`translate(${region.x} ${region.y}) scale(${region.width / 300} ${region.height / 360})`}>
        {guides && <><rect width="300" height="360" fill="none" stroke="#626e44" strokeDasharray="6 6" strokeOpacity=".5" strokeWidth="1.5" /><path d="M150 0V360M0 180H300" stroke="#626e44" strokeOpacity=".2" strokeDasharray="4 6" pointerEvents="none" /></>}
        {face.layers.filter(layer => !layer.hidden).map(layer => <g key={layer.id} transform={`translate(${layer.x} ${layer.y}) rotate(${layer.rotation} ${layer.width / 2} ${layer.height / 2})`} onPointerDown={event => start(event, layer, 'move')} style={{ cursor: layer.locked ? 'not-allowed' : 'move' }}>
          <rect width={layer.width} height={layer.height} fill="transparent" stroke={selectedId === layer.id ? '#4f5a40' : 'transparent'} strokeWidth="2" strokeDasharray={layer.locked ? '4 3' : undefined} />
          {selectedId === layer.id && !layer.locked && <g onPointerDown={event => start(event, layer, 'resize')} style={{ cursor: 'nwse-resize' }}><rect x={layer.width - 8} y={layer.height - 8} width="16" height="16" fill="#fff" stroke="#4f5a40" strokeWidth="2" /></g>}
        </g>)}
      </g>
    </svg>
  </div>;
}
