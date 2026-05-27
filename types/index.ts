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
  total_amount: number;
  notes: string | null;
  cancel_reason: string | null;
  confirmed_at: string | null;
  estimated_ready_at: string | null;
  created_at: string;
  table?: Table;
  items?: OrderItem[];
}

export type OrderStatus =
  | 'PENDING_CASH'
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SERVED'
  | 'CANCELLED';

export type PaymentMethod = 'CASH' | 'QRIS' | 'TRANSFER_BCA';

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

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  role: 'cashier' | 'koki' | 'owner';
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

export interface CartItem {
  menu_item: MenuItem;
  quantity: number;
  selectedVariations: VariationSelection[];
  notes: string;
  subtotal: number;
}

