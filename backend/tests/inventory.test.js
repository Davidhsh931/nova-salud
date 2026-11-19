const { test } = require('node:test');
const assert = require('node:assert/strict');
const { availableStock, expiredBatches, assertSaleItems } = require('../src/inventory');
const today = '2026-11-15';
const batches = [
  { code: 'A', expiresAt: '2026-11-14', quantity: 8 },
  { code: 'B', expiresAt: '2026-11-15', quantity: 3 },
  { code: 'C', expiresAt: '2027-01-01', quantity: 4 },
];
test('stock disponible excluye lotes vencidos', () => assert.equal(availableStock(batches, today), 7));
test('lote que vence hoy todavía se contabiliza', () => assert.equal(availableStock([batches[1]], today), 3));
test('alerta de vencidos identifica unidades no vendibles', () => assert.deepEqual(expiredBatches(batches,today).map(b=>b.code), ['A']));
test('venta rechaza líneas repetidas y cantidades inválidas', () => {
  assert.equal(assertSaleItems([{productId:1,quantity:2},{productId:1,quantity:3}]), false);
  assert.equal(assertSaleItems([{productId:1,quantity:0}]), false);
  assert.equal(assertSaleItems([{productId:1,quantity:2}]), true);
});
