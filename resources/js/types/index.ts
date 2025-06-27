import { PageProps as InertiaPageProps } from '@inertiajs/core';

// TIPE-TIPE DASAR
export type User = {
    id: number;
    name: string;
    email: string;
    username: string;
    role: 'admin_ukur' | 'admin_gudang' | 'admin_qc';
};

export type BreadcrumbItem = {
    title: string;
    href: string;
};

export type Item = {
    id: number;
    nama_item: string;
    jenjang: string;
    jenis_kelamin: string;
    size: string;
    stock?: { qty: number; };
};

export type OrderItem = {
    id: number;
    item_id: number;
    order_id: number;
    order_number: string;
    status: 'in-progress' | 'completed' | 'pending' | 'uncompleted';
    qty_requested: number;
    qty_provided: number;
    created_at: string;
    updated_at: string;
    item: Item;
};

export type Order = {
    id: number;
    order_number: string;
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    status: 'in-progress' | 'completed' | 'pending' | 'cancelled';
    notif_status: boolean;
    return_status: boolean;
    created_at: string;
    updated_at: string;
    order_items: OrderItem[];
    items_count?: number; // dari withCount
};

// TIPE PROPS HALAMAN DASAR
export interface PageProps extends InertiaPageProps {
    auth: {
        user: User;
    };
    ziggy: {
        location: string;
        port: number | null;
        query: Record<string, string>;
        route: string;
        url: string;
        defaults: Record<string, any>;
        routes: Record<string, any>;
    };
}

// --- TIPE PROPS SPESIFIK UNTUK SETIAP HALAMAN ---

// ADMIN UKUR
export interface AdminUkurDashboardProps extends PageProps {
    orderStats: {
        totalOrders: number;
        inProgressOrders: number;
        completedOrders: number;
    };
    recentOrders: Order[];
}

export interface AdminUkurOrderIndexProps extends PageProps {
    orders: {
        data: Order[];
        meta: { links: { url: string | null; label: string; active: boolean; }[] };
        links: { prev: string | null; next: string | null; };
    };
}

export interface AdminUkurOrderCreateProps extends PageProps {
    items: Item[];
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
    nextOrderId?: number;
}

export interface AdminUkurOrderShowProps extends PageProps {
    order: Order;
}

// ADMIN GUDANG
export interface AdminGudangDashboardProps extends PageProps {
    orderStats: {
        belum_terbaca: number;
        sudah_terbaca: number;
        dikembalikan: number;
    };
    recentOrders: Order[];
}

export interface AdminGudangItemsIndexProps extends PageProps {
    items: {
        data: Item[];
        links: any; // Sederhanakan untuk sekarang
    };
    filters: Record<string, string>;
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
}

export interface AdminGudangItemsCreateProps extends PageProps {
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
}

export interface AdminGudangStockShowProps extends PageProps {
    item: Item;
}

// ADMIN QC
export interface AdminQcDashboardProps extends PageProps {
    inProgressOrders?: any;
    pendingOrders?: any;
    completedOrders?: any;
    returnedOrders?: any;
    cancelledOrders?: any;
    qcStats?: {
        inProgress: number;
        completed: number;
        pending: number;
        returned: number;
        cancelled: number;
    };
    filters?: {
        perPage?: number;
    };
}