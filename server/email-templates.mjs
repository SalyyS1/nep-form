const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const header = value => String(value ?? '').replace(/[\r\n\u0000-\u001f\u007f]/g, ' ').slice(0, 180);
const money = value => `${new Intl.NumberFormat('vi-VN').format(value)} ₫`;
const statuses = { pending: 'Chờ xác nhận', confirmed: 'Đã xác nhận', packing: 'Đang chuẩn bị', shipping: 'Đang giao', delivered: 'Đã giao', cancelled: 'Đã hủy' };
const payments = { unpaid: 'Chưa thu tiền', pending: 'Chờ xác nhận chuyển khoản', paid: 'Đã thu tiền', review: 'Cần đối soát' };

function message(subject, lines, link, linkLabel) {
  return {
    subject: header(subject),
    text: `${lines.join('\n\n')}\n\n${linkLabel}: ${link}\n\nNẾP FORM`,
    html: `<div lang="vi">${lines.map(line => `<p>${escapeHtml(line).replace(/\n/g, '<br>')}</p>`).join('')}<p><a href="${escapeHtml(link)}">${escapeHtml(linkLabel)}</a></p><p>NẾP FORM</p></div>`,
  };
}
export function accountEmail(user, purpose, link) {
  const verify = purpose === 'verification';
  return message(verify ? 'Xác minh email NẾP FORM' : 'Đặt lại mật khẩu NẾP FORM', [
    `Chào ${user.name},`,
    verify ? 'Vui lòng xác minh địa chỉ email để đặt hàng tại NẾP FORM. Liên kết có hiệu lực trong 24 giờ và chỉ dùng một lần.' : 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn. Liên kết có hiệu lực trong 30 phút và chỉ dùng một lần.',
    'Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email.',
  ], link, verify ? 'Xác minh email' : 'Đặt lại mật khẩu');
}
export function orderEmail(order, event, origin) {
  const lines = [
    `Chào ${order.customerName},`,
    event === 'receipt' ? `NẾP FORM đã nhận đơn ${order.code}.` : `Đơn ${order.code} có cập nhật mới.`,
    `Trạng thái: ${statuses[order.status] ?? order.status}\nThanh toán: ${payments[order.paymentStatus] ?? order.paymentStatus}`,
    order.items.map(item => `${item.name} · ${item.size} · ${item.color} × ${item.quantity}: ${money(item.unitPrice * item.quantity)}`).join('\n'),
    `Tiền hàng: ${money(order.subtotal)}\nGiảm giá${order.coupon ? ` (${order.coupon.code})` : ''}: ${money(order.discount ?? 0)}\nVận chuyển: ${money(order.shipping)}\nTổng cộng: ${money(order.total)}`,
    order.paymentMethod === 'bank' ? 'Phương thức: Chuyển khoản ngân hàng' : 'Phương thức: Thanh toán khi nhận hàng',
  ];
  if (order.carrier) lines.push(`Đơn vị vận chuyển: ${order.carrier}`);
  if (order.trackingCode) lines.push(`Mã vận đơn: ${order.trackingCode}`);
  return message(`${event === 'receipt' ? 'Đã nhận đơn' : 'Cập nhật đơn'} ${order.code} · NẾP FORM`, lines, `${origin}/don-hang/${encodeURIComponent(order.id)}`, 'Xem đơn hàng');
}
