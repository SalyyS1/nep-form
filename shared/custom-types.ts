export type DesignSide = 'front' | 'back';
export type PrintArea = 'small' | 'medium' | 'large';
export interface TextShadow { enabled: boolean; color: string; opacity: number; blur: number; offsetX: number; offsetY: number }
export interface TextEffects { curve: number; outlineWidth: number; outlineColor: string; shadow: TextShadow }
export interface DesignLayer {
  id: string; kind: 'text' | 'shape' | 'image'; x: number; y: number; width: number; height: number;
  rotation: number; fill: string; opacity: number; text?: string; fontFamily?: string;
  fontWeight?: number; shape?: string; src?: string; hidden?: boolean; locked?: boolean;
  textEffects?: TextEffects;
}
export interface DesignFace { area: PrintArea; layers: DesignLayer[] }
export interface DesignFont { id: string; name: string; dataUrl: string }
export interface DesignProject { version: 1; name: string; productId: string; color: string; size: string; faces: Record<DesignSide, DesignFace>; fonts?: DesignFont[] }
export interface CustomPricing { version: number; text: number; shape: number; image: number; areas: Record<PrintArea, number>; extraLayer: number }
export interface PriceLine { face: DesignSide; label: string; amount: number }
export interface CustomPrice { basePrice: number; surcharge: number; unitPrice: number; lines: PriceLine[] }
export interface CustomSummary { designId: string; name: string; unitPrice: number; surcharge: number; lines: PriceLine[]; faces: DesignSide[] }
export interface DesignRecord { id: string; userId: string; project: DesignProject; createdAt: string; colorHex?: string }
export interface DesignListRecord { id: string; userId: string; project: Pick<DesignProject, 'name' | 'productId' | 'color' | 'size'>; createdAt: string }
