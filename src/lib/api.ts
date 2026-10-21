export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options, credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new ApiError(data.error || 'Có lỗi xảy ra. Bạn thử lại nhé.', response.status);
  return data as T;
}
export const send = (method: string, body?: unknown): RequestInit => ({ method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
export const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(value);
export const dateLabel = (value: string) => new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(value));
export const orderLabels = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', packing: 'Đang chuẩn bị', shipping: 'Đang giao', delivered: 'Đã giao hàng', cancelled: 'Đã hủy' };
export const paymentLabels = { unpaid: 'Chưa thu tiền', pending: 'Chờ thanh toán', paid: 'Đã thanh toán', review: 'Cần đối soát' };
