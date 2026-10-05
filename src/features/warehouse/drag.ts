/** MIME type for products dragged inside the app; plain text carries the SKU for external targets. */
export const PRODUCT_DRAG_TYPE = "application/x-visionstock-product";

export function startProductDrag(event: React.DragEvent, productId: string, sku: string) {
  event.dataTransfer.setData(PRODUCT_DRAG_TYPE, productId);
  event.dataTransfer.setData("text/plain", sku);
  event.dataTransfer.effectAllowed = "move";
}

export function isProductDrag(event: React.DragEvent): boolean {
  return event.dataTransfer.types.includes(PRODUCT_DRAG_TYPE);
}
