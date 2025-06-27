import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';
import { PageProps as InertiaPageProps } from '@inertiajs/core';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}

// export interface User {
//     id: number;
//     name: string;
//     email: string;
//     avatar?: string;
//     email_verified_at: string | null;
//     created_at: string;
//     updated_at: string;
//     [key: string]: unknown; // This allows for additional properties...
// }

// Tipe untuk User yang sedang login
export type User = {
    id: number;
    username: string;
    role: 'admin_ukur' | 'admin_gudang' | 'admin_qc';
};

// Tipe dasar untuk data Order Anda
export type OrderType = {
    id: number;
    order_number: string;
    nama_murid: string;
    // tambahkan properti lain dari model Order Anda jika perlu
};

// Tipe untuk props halaman dari Inertia, termasuk data user
export interface PageProps extends InertiaPageProps {
    auth: {
        user: User;
    };
}
