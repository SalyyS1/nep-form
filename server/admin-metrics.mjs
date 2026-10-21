export async function adminMetrics(store, orders, products) {
  const active = orders.filter(o => o.status !== 'cancelled');
  const paid = active.filter(o => o.paymentStatus === 'paid');
  const daily = new Map();
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }));
  for (let i = 13; i >= 0; i--) {
    const day = new Date(today); day.setDate(day.getDate() - i);
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
    daily.set(date, { date, orders: 0, revenue: 0 });
  }
  for (const order of orders) {
    const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(order.createdAt));
    const day = daily.get(date);
    if (day) { day.orders++; if (order.paymentStatus === 'paid' && order.status !== 'cancelled') day.revenue += order.total; }
  }
  return {
    revenue: paid.reduce((sum, o) => sum + o.total, 0), orderCount: orders.length,
    pendingCount: orders.filter(o => o.status === 'pending').length,
    lowStockCount: products.filter(p => p.isActive && p.stock < 10).length,
    unpaidTotal: active.filter(o => ['pending', 'unpaid'].includes(o.paymentStatus)).reduce((sum, o) => sum + o.total, 0),
    reviewCount: orders.filter(o => o.paymentStatus === 'review').length,
    customOrderCount: orders.filter(o => o.items.some(i => i.custom)).length,
    supportOpen: (await store.list('support-thread')).filter(t => t.status === 'open').length,
    daily: [...daily.values()],
    statuses: Object.fromEntries(['pending', 'confirmed', 'packing', 'shipping', 'delivered', 'cancelled'].map(s => [s, orders.filter(o => o.status === s).length])),
  };
}
