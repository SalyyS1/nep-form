import type { CustomPricing, CustomSummary } from '../../shared/custom-types';
export type Role = 'customer' | 'admin';
export interface User { id: string; name: string; email: string; role: Role; emailVerified?: boolean }
export interface Variant { id: string; size: string; color: string; stock: number }
export interface Product {
  salePrice?: number | null; saleStartsAt?: string | null; saleEndsAt?: string | null;
  id: string; slug: string; name: string; category: string; categoryLabel: string; price: number;
  description: string; material: string; fit: string; images: string[];
  colors: { name: string; hex: string }[]; sizes: string[]; stock: number;
  featured: boolean; isActive: boolean; isDemo: boolean; variants: Variant[]; version?: number; isCustomBase?: boolean;
}
export interface CartItem { id: string; productId: string; size: string; color: string; quantity: number; custom?: CustomSummary }
export interface Address { id: string; recipient: string; phone: string; province: string; ward: string; line1: string; isDefault: boolean }
export type OrderStatus = 'pending' | 'confirmed' | 'packing' | 'shipping' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'review';
export interface OrderItem { productId: string; name: string; image: string; size: string; color: string; quantity: number; unitPrice: number; custom?: CustomSummary }
export interface Order {
  discount?: number; coupon?: { id: string; code: string; label: string; type: 'percent' | 'fixed'; value: number; discount: number; firstOrderOnly?: boolean; minQuantity?: number };
  version?: number; trackingCode?: string; carrier?: string; updatedAt?: string;
  id: string; code: string; userId: string; customerName: string; customerEmail: string;
  items: OrderItem[]; address: Address; subtotal: number; shipping: number; total: number;
  paymentMethod: 'cod' | 'bank'; paymentStatus: PaymentStatus; status: OrderStatus; createdAt: string; note: string;
}
export interface Promotion {
  firstOrderOnly?: boolean; minQuantity?: number; showAtCheckout?: boolean;
  id: string; code: string; label: string; type: 'percent' | 'fixed'; value: number; minSubtotal: number;
  maxDiscount: number | null; startsAt: string | null; endsAt: string | null;
  usageLimit: number | null; perUserLimit: number | null; isActive: boolean; version: number; usedCount?: number;
}
export interface CheckoutPromotion {
  code: string; label: string; type: 'percent' | 'fixed'; value: number;
  minSubtotal: number; maxDiscount: number | null; minQuantity: number; firstOrderOnly: boolean;
  startsAt: string | null; endsAt: string | null; usageLimit: number | null; perUserLimit: number | null;
  eligible: boolean; discount: number; reasonCode: string | null; reason: string | null;
}
export interface CheckoutPromotions {
  promotions: CheckoutPromotion[]; bestCode: string | null; subtotal: number; quantity: number;
}
export interface CheckoutQuote {
  items: {productId:string; size:string; color:string; quantity:number; unitPrice:number; designId?:string}[];
  subtotal:number; shipping:number; discount:number; total:number;
  coupon?: NonNullable<Order['coupon']>;
}
export interface Settings { shopName: string; shippingFee: number; contactEmail: string; checkoutEnabled: boolean; bankEnabled: boolean }
export interface Bootstrap {
  user: User | null; products: Product[]; categories: { id: string; label: string }[];
  settings: Settings; cart: CartItem[]; addresses: Address[]; orders: Order[]; mode: 'local' | 'production'; customPricing?: CustomPricing; email?: { configured: boolean; verificationRequired: boolean };
}
export interface AdminData {
  orders: Order[]; users: User[]; products: Product[]; settings: Settings;
  stats: { revenue: number; orderCount: number; pendingCount: number; lowStockCount: number; unpaidTotal: number; reviewCount: number; customOrderCount: number; supportOpen: number; daily: {date:string;orders:number;revenue:number}[]; statuses: Record<string, number> };
  audit: AuditEvent[];
}
export interface AuditEvent { id: string; actorId: string; action: string; createdAt: string; target: string | { id?: string; toStatus?: OrderStatus; toPayment?: PaymentStatus } }
