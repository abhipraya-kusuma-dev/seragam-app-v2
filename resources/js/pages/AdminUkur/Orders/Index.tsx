import { Head, Link, router } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, Pencil, Loader2, Search } from 'lucide-react';
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
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import EditOrderModal from '@/components/ukur/EditOrderModal';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Lock duration (15 minutes)
const LOCK_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds

interface Order {
    id: number;
    order_number: string;
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    created_at: string;
    status: string;
    items_count?: number;
    return_status: boolean;
    edit_status: boolean;
    locked_at: string | null;
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
    filters?: {
        search?: string;
        jenjang?: string;
        gender?: string;
    };
}

const OrderIndex = ({ orders, returnedOrders, counts, filters = {} }: Props) => {
    const [activeTab, setActiveTab] = useState('all');
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [activeOrderNumbers, setActiveOrderNumbers] = useState<string[]>([]);
    const [loadingOrder, setLoadingOrder] = useState<string | null>(null);
    
    // Filter states
    const [search, setSearch] = useState(filters.search || '');
    const [jenjangFilter, setJenjangFilter] = useState(filters.jenjang || 'all');
    const [genderFilter, setGenderFilter] = useState(filters.gender || 'all');

    // Check if order is locked based on locked_at timestamp
    const isOrderLocked = (order: Order): boolean => {
        if (!order.locked_at) {
            return false;
        }
        
        try {
            const lockTime = new Date(order.locked_at).getTime();
            const currentTime = Date.now();
            return (currentTime - lockTime) < LOCK_DURATION;
        } catch (e) {
            console.error('Invalid date format', order.locked_at);
            return false;
        }
    };

    // Generic options for all router.reload calls
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
        router.reload({ ...reloadOptions, only: ['orders', 'counts'] });
    });

    useEcho('ukur', 'TriggerPopupUkur', (event: {orderNumber: string, modalState: boolean}) => {

        
        // Refresh data to get updated lock status
        router.reload({ 
            ...reloadOptions,
            only: ['orders', 'returnedOrders', 'counts'] 
        });
    });

    const handleEditOrder = async (order: Order) => {
        setLoadingOrder(order.order_number); // Immediately disable button
        
        try {
            await fetch(`/api/trigger/popup-ukur-open`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    orderNumber: order.order_number,
                    modalState: true
                }),
            });
            setSelectedOrder(order);
            setIsEditModalOpen(true);
        } catch (error) {
            console.error("Gagal memuat data item:", error);
            toast.error('Gagal memuat data item.');
        } finally {
            setLoadingOrder(null); // Reset loading state
        }
    };

    const handleEditSuccess = () => {
        router.reload({ 
            only: ['orders', 'returnedOrders', 'counts'] 
        });
    };

    // Debounced filter effect
    useEffect(() => {
        const handler = setTimeout(() => {
            router.get('/admin/ukur/orders', {
                tab: activeTab,
                search,
                jenjang: jenjangFilter,
                gender: genderFilter,
            }, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 500);

        return () => clearTimeout(handler);
    }, [search, jenjangFilter, genderFilter, activeTab]);

    // The active data is now directly from the props
    const activeData = activeTab === 'all' ? orders : returnedOrders;

    const renderPagination = (paginatedData: PaginatedOrders) => {
        if (!paginatedData || !paginatedData.meta || paginatedData.meta.total <= paginatedData.meta.per_page) {
             return null;
        }

        const handlePageChange = (url: string | null) => {
            if (url) {
                router.get(url, {
                    search,
                    jenjang: jenjangFilter,
                    gender: genderFilter,
                    tab: activeTab,
                }, {
                    preserveState: true,
                    preserveScroll: true,
                });
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
                                <span>Order Terdistribusi</span>
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

                {/* Filter Section */}
                <Card className="mb-6">
                    <CardContent className="pt-6">
                        <div className="flex flex-wrap gap-4 items-end">
                            <div className="flex-1 min-w-[200px] space-y-2">
                                <Label htmlFor="search-input">Cari Order/Murid</Label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="search-input"
                                        type="text"
                                        placeholder="Cari nomor order atau nama murid..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        className="w-full pl-9"
                                    />
                                </div>
                            </div>
                            <div className="w-40 space-y-2">
                                <Label>Jenjang</Label>
                                <Select value={jenjangFilter} onValueChange={setJenjangFilter}>
                                    <SelectTrigger><SelectValue placeholder="Semua Jenjang" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Jenjang</SelectItem>
                                        <SelectItem value="SDIT">SDIT</SelectItem>
                                        <SelectItem value="SDS">SDS</SelectItem>
                                        <SelectItem value="SMP">SMP</SelectItem>
                                        <SelectItem value="SMA">SMA</SelectItem>
                                        <SelectItem value="SMK">SMK</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="w-40 space-y-2">
                                <Label>Jenis Kelamin</Label>
                                <Select value={genderFilter} onValueChange={setGenderFilter}>
                                    <SelectTrigger><SelectValue placeholder="Semua" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua</SelectItem>
                                        <SelectItem value="Pria">Pria</SelectItem>
                                        <SelectItem value="Wanita">Wanita</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

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
                                                order.edit_status? 'bg-purple-100 text-purple-800' :
                                                order.return_status && !order.edit_status? 'bg-red-100 text-red-800' :
                                                order.status === 'in-progress'? 'bg-blue-100 text-blue-800' :
                                                order.status === 'cancelled' ? 'bg-red-800 text-red-00' :
                                                'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {order.status === 'completed' ? 'Selesai' :
                                                order.edit_status? 'Diedit' :
                                                order.return_status && !order.edit_status? 'Dikembalikan' :
                                                order.status === 'in-progress'? 'Sedang Diproses' :
                                                order.status === 'cancelled' ? 'Dibatalkan' :
                                                'Pending'}
                                            </span>
                                        </TableCell>
                                        <TableCell className="flex gap-2">
                                            {activeTab === 'returned' ? (
                                                <Button 
                                                    variant="outline" 
                                                    size="sm"
                                                    onClick={() => handleEditOrder(order)}
                                                    disabled={
                                                        isOrderLocked(order) || 
                                                        activeOrderNumbers.includes(order.order_number) ||
                                                        loadingOrder === order.order_number
                                                    }
                                                    className="min-w-[80px] justify-center"
                                                >
                                                    {loadingOrder === order.order_number ? (
                                                        <div className="flex items-center gap-2">
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            Memuat...
                                                        </div>
                                                    ) : isOrderLocked(order) || activeOrderNumbers.includes(order.order_number) ? (
                                                        "Sedang diedit"
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            <Pencil className="w-4 h-4" />
                                                            Edit
                                                        </div>
                                                    )}
                                                </Button>
                                            ) : (
                                                <Link href={route('admin-ukur.orders.show', { order: order.id })}>
                                                    <Button variant="outline" size="sm">
                                                        Detail
                                                    </Button>
                                                </Link>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    {renderPagination(activeData)}
                </div>
            </div>
            {selectedOrder && (
                <EditOrderModal
                    isOpen={isEditModalOpen}
                    onClose={async () => {
                        setIsEditModalOpen(false);
                        if (selectedOrder) {
                            await fetch(`/api/trigger/popup-ukur-closed`, {
                                method: 'POST',
                                headers: {'Content-Type': 'application/json'},
                                body: JSON.stringify({
                                    orderNumber: selectedOrder.order_number,
                                    modalState: false
                                }),
                            });
                        }
                    }}
                    order={selectedOrder}
                    onSuccess={handleEditSuccess}
                />
            )}
        </AppLayout>
    );
};

export default OrderIndex;