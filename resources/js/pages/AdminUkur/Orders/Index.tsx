import { Head, Link, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from 'lucide-react';
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious
} from '@/components/ui/pagination';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';
import { useEcho } from '@laravel/echo-react';
import { useState } from 'react'; // No longer need useEffect

// --- INTERFACES --- (No changes needed here)

interface Order {
    id: number;
    order_number: string;
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    created_at: string;
    status: string;
    items_count?: number;
}

interface PaginationLink {
    url: string | null;
    label: string;
    active: boolean;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    per_page: number;
    links: PaginationLink[];
}

interface PaginatedOrders {
    data: Order[];
    meta: PaginationMeta;
    links: {
        first: string | null;
        last: string | null;
        prev: string | null;
        next: string | null;
    };
}

interface Props {
    orders: PaginatedOrders;
    returnedOrders: PaginatedOrders;
    counts: {
        all: number;
        returned: number;
    };
}

// --- COMPONENT ---

const OrderIndex = ({ orders, returnedOrders, counts }: Props) => {
    const [activeTab, setActiveTab] = useState('all');

    // --- REAL-TIME EVENT HANDLING ---

    // Generic options for all router.reload calls to keep the user's position
    const reloadOptions = {
        preserveState: true,
        preserveScroll: true,
    };

    useEcho('ukur', 'OrderReturned', () => {
        router.reload({ ...reloadOptions, only: ['orders', 'returnedOrders', 'counts'] });
    });

    useEcho('ukur', 'OrderCancelled', () => {
        router.reload({ ...reloadOptions, only: ['orders', 'returnedOrders', 'counts'] });
    });

    useEcho('ukur', 'OrderStatusUpdatedUkur', () => {
        router.reload({ ...reloadOptions, only: ['orders', 'returnedOrders', 'counts'] });
    });

    useEcho('ukur', 'NewOrderCreatedUkur', () => {
        // A new order only affects the 'all' list and its count
        router.reload({ ...reloadOptions, only: ['orders', 'counts'] });
    });

    // --- DYNAMIC DATA & RENDER FUNCTIONS ---

    // The active data is now directly from the props
    const activeData = activeTab === 'all' ? orders : returnedOrders;

    const renderPagination = (paginatedData: PaginatedOrders) => {
        if (!paginatedData || !paginatedData.meta || paginatedData.meta.total <= paginatedData.meta.per_page) {
             return null;
        }

        const handlePageChange = (url: string | null) => {
            if (url) {
                router.get(url, {}, { preserveState: true, preserveScroll: true });
            }
        };

        return (
            <div className="flex items-center justify-between border-t pt-4 mt-4">
                <Pagination className="mt-0">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => handlePageChange(paginatedData.links.prev)}
                                className={!paginatedData.links.prev ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                        {paginatedData.meta.links.slice(1, -1).map((link, index) => (
                            <PaginationItem key={index}>
                                <PaginationLink
                                    onClick={() => handlePageChange(link.url)}
                                    isActive={link.active}
                                    className={cn("h-10 w-10", link.url ? "cursor-pointer" : "pointer-events-none opacity-50")}
                                >
                                    <div dangerouslySetInnerHTML={{ __html: link.label }} />
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem>
                            <PaginationNext
                                onClick={() => handlePageChange(paginatedData.links.next)}
                                className={!paginatedData.links.next ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        );
    };
    
    // --- JSX RENDER --- (No changes needed from here down)

    return (
        <AppLayout>
            <div className="container mx-auto py-8">
                <Head title="Daftar Order" />
                <div className="flex justify-between items-center mb-6">
                    <Link href="/dashboard" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dasbor
                    </Link>
                    <h1 className="text-2xl font-bold">Daftar Order</h1>
                    <Link href={route('admin-ukur.orders.create')}>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Buat Order Baru
                        </Button>
                    </Link>
                </div>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="all">
                            <div className="flex items-center gap-2">
                                <span>Semua Order</span>
                                <span className="bg-blue-100 text-blue-800 rounded-full px-2 py-0.5 text-xs font-medium">
                                    {counts.all}
                                </span>
                            </div>
                        </TabsTrigger>
                        <TabsTrigger value="returned">
                            <div className="flex items-center gap-2">
                                <span>Order Dikembalikan</span>
                                <span className="bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-xs font-medium">
                                    {counts.returned}
                                </span>
                            </div>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="rounded-lg shadow border pb-4 px-4 pt-2">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Order</TableHead>
                                <TableHead>Nama Murid</TableHead>
                                <TableHead>Jenjang</TableHead>
                                <TableHead>Jenis Kelamin</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="w-40">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {activeData.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                        Belum ada order pada tab ini
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activeData.data.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">{order.order_number}</TableCell>
                                        <TableCell>{order.nama_murid}</TableCell>
                                        <TableCell>{order.jenjang}</TableCell>
                                        <TableCell>{order.jenis_kelamin}</TableCell>
                                        <TableCell>
                                            {new Date(order.created_at).toLocaleDateString('id-ID', {
                                                day: '2-digit', month: 'short', year: 'numeric',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`px-2 py-1 rounded text-xs capitalize ${
                                                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                order.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                                order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {order.status.replace('-', ' ')}
                                            </span>
                                        </TableCell>
                                        <TableCell className="flex gap-2">
                                            <Link href={route('admin-ukur.orders.show', { order: order.id })}>
                                                <Button variant="outline" size="sm">
                                                    Detail
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {renderPagination(activeData)}
                </div>
            </div>
        </AppLayout>
    );
};

export default OrderIndex;