export interface Table {
  id: string;
  table_number: number;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  sort_order: number;
}

export interface MenuItem {
  id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_sold_out: boolean;
  created_at: string;
  category?: MenuCategory;
  variations?: MenuVariation[];
}

export interface MenuVariation {
  id: string;
  menu_item_id: string;
  variation_type: string;
  label: string;
  extra_price: number;
}

export interface Order {
  id: string;
  table_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  total_amount: number;
  notes: string | null;
  cancel_reason: string | null;
  confirmed_at: string | null;
  estimated_ready_at: string | null;
  created_at: string;
  is_archived: boolean;
  table?: Table;
  items?: OrderItem[];
}

export type OrderStatus =
  | 'QUEUED'
  | 'PROCESSING'
  | 'SERVED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'QRIS';

export type PaymentStatus = 'PAID' | 'UNPAID';

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  variations: VariationSelection[];
  subtotal: number;
  notes: string | null;
}

export interface VariationSelection {
  variation_type: string;
  label: string;
  extra_price: number;
}

// Kitchen Display sekarang dipegang kasir — role 'koki' sudah dihapus.
export type StaffRole = 'cashier' | 'owner';

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  detail: Record<string, unknown> | null;
  created_at: string;
}

// ---- Antrian cetak struk (printer Bluetooth via aplikasi Android) ----

export type PrintJobKind = 'RECEIPT' | 'REPRINT';
export type PrintJobStatus = 'PENDING' | 'PRINTING' | 'PRINTED' | 'FAILED';
export type PrintJobTrigger = 'QRIS_SETTLED' | 'CASH_VERIFIED' | 'CASHIER_PAID_ORDER' | 'STAFF_REPRINT';

export interface PrintJob {
  id: string;
  order_id: string;
  kind: PrintJobKind;
  status: PrintJobStatus;
  trigger: PrintJobTrigger | null;
  // Snapshot struk — bentuknya `Receipt` dari lib/receipt.
  payload: Record<string, unknown>;
  text_body: string;
  attempts: number;
  last_error: string | null;
  device_id: string | null;
  created_at: string;
  claimed_at: string | null;
  printed_at: string | null;
}

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
  selectedVariations: VariationSelection[];
  notes: string;
  subtotal: number;
}

