
export interface OrderItem {
    id: number;
    item_id: number;
    order_id: number;
    order_number: string;
    qty_requested: number;
    qty_provided: number;
    status: string;
    created_at: string;
    updated_at: string;
    item: {
      id: number;
      nama_item: string;
      jenjang: string;
      jenis_kelamin: string;
      size: string;
    };
  }
  
  export interface Order {
    id: number;
    order_number: string;
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    status: string;
    notif_status: boolean;
    return_status: boolean;
    created_at: string;
    updated_at: string;
    order_items: OrderItem[];
  }