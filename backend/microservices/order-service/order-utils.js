function buildOrderItem(item, product) {
  const quantity = Number(item.quantity || 1);
  const price = Number(product.price);

  return {
    product_id: item.product_id,
    product_name: product.name,
    product_image: product.image || '',
    quantity,
    price,
    subtotal: price * quantity
  };
}

module.exports = { buildOrderItem };
