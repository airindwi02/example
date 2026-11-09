export const ORDER_STATUS = {
  ordered: "Dipesan",
  partial: "Diterima Sebagian",
  complete: "Selesai",
  cancelled: "Dibatalkan",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
export type OrderCommand = {
  requestId: string;
  supplierId: string;
  orderDate: string;
  estimatedDate: string;
  lines: { itemId: string; quantity: string; price: string }[];
};

export type OrderSnapshot = {
  suppliers: { id: string; name: string }[];
  items: { id: string; name: string; unit: string }[];
  orders: {
    id: string;
    supplierId: string;
    supplierName: string;
    createdBy: string;
    orderDate: string;
    estimatedDate: string;
    status: string;
    lines: {
      itemId: string;
      itemName: string;
      unit: string;
      quantity: string;
      price: string;
      received: string;
    }[];
  }[];
};

export type OrderResult =
  | { ok: true; data: OrderSnapshot; id: string; replayed?: boolean; message: string }
  | { ok: false; message: string };
