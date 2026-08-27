/** Supabase `payments` table */
export type PaymentRow = {
  id: number | string;
  client_txn_id: string;
  amount: number | string;
  customer_id: number | string | null;
  gateway_order_id: string | null;
  created_at: string;
  txn_at: string | null;
  remark: string | null;
  status: string;
  upi_txn_id: string | null;
  razorpay_payment_id: string | null;
  order_id: number | string | null;
};

export type PaymentDto = {
  id: number;
  clientTxnId: string;
  amount: number;
  customerId: number | null;
  gatewayOrderId: string | null;
  createdAt: string;
  txnAt: string | null;
  remark: string | null;
  status: string;
  upiTxnId: string | null;
  razorpayPaymentId: string | null;
  orderId: number | null;
};

export type PaymentWriteBody = {
  clientTxnId?: string;
  client_txn_id?: string;
  amount?: number;
  customerId?: number | null;
  customer_id?: number | null;
  gatewayOrderId?: string | null;
  gateway_order_id?: string | null;
  txnAt?: string | null;
  txn_at?: string | null;
  remark?: string | null;
  status?: string;
  upiTxnId?: string | null;
  upi_txn_id?: string | null;
  razorpayPaymentId?: string | null;
  razorpay_payment_id?: string | null;
  orderId?: number | null;
  order_id?: number | null;
};

export function mapPayment(row: PaymentRow): PaymentDto {
  return {
    id: Number(row.id),
    clientTxnId: row.client_txn_id,
    amount: Number(row.amount) || 0,
    customerId: row.customer_id == null ? null : Number(row.customer_id),
    gatewayOrderId: row.gateway_order_id,
    createdAt: row.created_at,
    txnAt: row.txn_at,
    remark: row.remark,
    status: row.status || "pending",
    upiTxnId: row.upi_txn_id,
    razorpayPaymentId: row.razorpay_payment_id,
    orderId: row.order_id == null ? null : Number(row.order_id),
  };
}

export const PAYMENT_COLS =
  "id, client_txn_id, amount, customer_id, gateway_order_id, created_at, txn_at, remark, status, upi_txn_id, razorpay_payment_id, order_id" as const;
