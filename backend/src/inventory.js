// Reglas puras de inventario, reutilizadas por la API y verificables sin MySQL.
function availableStock(batches, today) {
  return batches.filter(b => String(b.expiresAt) >= today).reduce((sum, b) => sum + Number(b.quantity), 0);
}
function expiredBatches(batches, today) {
  return batches.filter(b => Number(b.quantity) > 0 && String(b.expiresAt) < today);
}
function assertSaleItems(items) {
  if (!Array.isArray(items) || items.length === 0) return false;
  return items.every(i => Number.isSafeInteger(Number(i.productId)) && Number(i.productId) > 0 && Number.isSafeInteger(Number(i.quantity)) && Number(i.quantity) > 0) && new Set(items.map(i => Number(i.productId))).size === items.length;
}
module.exports = { availableStock, expiredBatches, assertSaleItems };
