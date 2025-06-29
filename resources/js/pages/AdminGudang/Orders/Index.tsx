import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect } from 'react';
import OrderDetailModal from '@/components/order/OrderDetailModal';
import { Order } from '@/types/order';
import { format } from 'date-fns';
import { Home, RotateCcw, Search } from 'lucide-react';
import { type PageProps } from '@inertiajs/core';
import { Link, usePage } from '@inertiajs/react';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import { 
    Pagination, 
    PaginationContent, 
    PaginationItem, 
    PaginationNext, 
    PaginationPrevious 
} from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useEcho } from '@laravel/echo-react';
import AppLayout from '@/layouts/app-layout';

interface PaginatedOrders {
    data: Order[];
    links: Array<{
        url: string | null;
        label: string;
        active: boolean;
    }>;
    meta: {
        current_page: number;
        from: number;
        last_page: number;
        per_page: number;
        to: number;
        total: number;
        path: string;
    };
}

interface Props extends PageProps {
    auth: {
        user: {
            username: string;
            role: string;
        };
    };
    newOrders: PaginatedOrders;
    viewedOrders: PaginatedOrders;
    returnedOrders: PaginatedOrders;
    counts: {
        new: number;
        viewed: number;
        returned: number;
    };
    filters?: {
        search?: string;
        jenjang?: string;
        gender?: string;
        perPage?: number;
    };
}

export default function OrderIndex({ 
    newOrders, 
    viewedOrders, 
    returnedOrders, 
    counts,
    filters = {}
}: Props) {
    const { auth } = usePage<Props>().props;
    const [activeSegment, setActiveSegment] = useState<'new' | 'viewed' | 'returned'>('new');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [resendingOrderId, setResendingOrderId] = useState<number | null>(null);
    const [openingDetailId, setOpeningDetailId] = useState<number | null>(null); // <-- ADDED
    
    // Filter states
    const [search, setSearch] = useState(filters.search || '');
    const [jenjangFilter, setJenjangFilter] = useState(filters.jenjang || 'all');
    const [genderFilter, setGenderFilter] = useState(filters.gender || 'all');
    const [activeOrderNumbers, setActiveOrderNumbers] = useState<string[]>([]);

    // --- useEcho IMPLEMENTATION ---
    useEcho(
        'gudang',
        'NewOrderCreated',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_gudang') {
                router.reload({
                    only: ['newOrders', 'counts'],
                });
            }
        }
    );
    useEcho(
        'gudang',
        'OrderReturned',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_gudang') {
                router.reload({
                    only: ['returnedOrders', 'counts'],
                });
            }
        }
    );
    useEcho(
        'gudang',
        'TriggerPopupGudang',
        (event: {orderNumber: string, modalState: boolean}) => {
            if (event.modalState) {
                setActiveOrderNumbers(prev => 
                    prev.includes(event.orderNumber) ? prev : [...prev, event.orderNumber]
                );
            } else {
                setActiveOrderNumbers(prev => prev.filter(num => num !== event.orderNumber));
            }
        }
    );

    // --- END of useEcho IMPLEMENTATION ---

    const openOrderDetail = async (order: Order) => {
        setOpeningDetailId(order.id); // <-- ADDED: Set loading state
        try {
            // Notify other clients this order is being opened
            await fetch(`/api/trigger/popup-gudang-open`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    orderNumber: order.order_number,
                    modalState: true
                }),
            });
            
            setSelectedOrder(order);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Failed to open order detail:", error);
            toast.error('Gagal membuka detail order.');
        } finally {
            setOpeningDetailId(null); // <-- ADDED: Reset loading state
        }
    };

    // Apply filters when they change
    const applyFilters = () => {
        const params = {
            search,
            jenjang: jenjangFilter,
            gender: genderFilter,
        };
        
        router.get('/admin/gudang/orders', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    };

    // Debounce filter changes
    useEffect(() => {
        const handler = setTimeout(() => {
            applyFilters();
        }, 500);
        
        return () => clearTimeout(handler);
    }, [search, jenjangFilter, genderFilter]);

    // Get current paginator based on active segment
    const getActivePaginator = () => {
        switch (activeSegment) {
            case 'new': return newOrders;
            case 'viewed': return viewedOrders;
            case 'returned': return returnedOrders;
            default: return newOrders;
        }
    };

    // Handle resend to QC
    const handleResendToQc = (orderId: number) => {
        setResendingOrderId(orderId);
        router.post(`/admin/gudang/orders/${orderId}/resend`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                toast.success('Order berhasil dikirim ulang ke QC', {
                    description: 'Order telah dikembalikan ke proses QC'
                });
            },
            onError: (error: any) => {
                toast.error('Gagal mengirim ulang order', {
                    description: error.message || 'Terjadi kesalahan saat mengirim ulang order'
                });
            },
            onFinish: () => {
                setResendingOrderId(null);
            }
        });
    };

    // Render pagination controls
    const renderPagination = () => {
        const paginator = getActivePaginator();
        if (!paginator || paginator.data.length === 0) return null;
        
        const queryParams = {
            search,
            jenjang: jenjangFilter,
            gender: genderFilter,
        };

        return (
          <AppLayout>
            <div className="mt-4 flex items-center justify-between">
                <Pagination className="mt-0">
                    <PaginationContent>
                        <PaginationItem>
                            {paginator.links[0].url ? (
                                <div 
                                    onClick={() => router.get(paginator.links[0].url!, queryParams, {
                                        preserveState: true,
                                        preserveScroll: true
                                    })}
                                    className={cn(
                                        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                                        "border border-input hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        "h-10 py-2 px-4"
                                    )}
                                >
                                    <PaginationPrevious />
                                </div>
                            ) : (
                                <span className={cn(
                                    "inline-flex items-center justify-center rounded-md text-sm font-medium",
                                    "border border-input opacity-50 cursor-not-allowed",
                                    "h-10 py-2 px-4"
                                )}>
                                    <PaginationPrevious />
                                </span>
                            )}
                        </PaginationItem>

                        {paginator.links
                            .filter((_, index) => index !== 0 && index !== paginator.links.length - 1)
                            .map((link, index) => (
                                <PaginationItem key={index}>
                                    {link.url ? (
                                        <div 
                                            onClick={() => router.get(link.url!, queryParams, {
                                                preserveState: true,
                                                preserveScroll: true
                                            })}
                                            className={cn(
                                                "inline-flex items-center justify-center rounded-md text-sm font-medium",
                                                "border border-input hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                                "h-10 w-10",
                                                link.active && "bg-accent text-accent-foreground"
                                            )}
                                        >
                                            {link.label}
                                        </div>
                                    ) : (
                                        <span className={cn(
                                            "inline-flex items-center justify-center rounded-md text-sm font-medium",
                                            "border border-input opacity-50 cursor-not-allowed",
                                            "h-10 w-10"
                                        )}>
                                            {link.label}
                                        </span>
                                    )}
                                </PaginationItem>
                            ))}

                        <PaginationItem>
                            {paginator.links[paginator.links.length - 1].url ? (
                                <div 
                                    onClick={() => router.get(paginator.links[paginator.links.length - 1].url!, queryParams, {
                                        preserveState: true,
                                        preserveScroll: true
                                    })}
                                    className={cn(
                                        "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
                                        "border border-input hover:bg-accent hover:text-accent-foreground cursor-pointer",
                                        "h-10 py-2 px-4"
                                    )}
                                >
                                    <PaginationNext />
                                </div>
                            ) : (
                                <span className={cn(
                                    "inline-flex items-center justify-center rounded-md text-sm font-medium",
                                    "border border-input opacity-50 cursor-not-allowed",
                                    "h-10 py-2 px-4"
                                )}>
                                    <PaginationNext />
                                </span>
                            )}
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
          </AppLayout>
        );
    };

    return (
      <AppLayout>
        <div className="min-h-screen">
            <Head title="Kelola Order" />
            
            {/* Header */}
            <header className="shadow">
                <div className="container mx-auto py-6 ">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                                <Home className="w-4 h-4 mr-2" />
                                Dasbor
                            </Link>
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold">Kelola Order</h1>
                        </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 border">
                {/* Segmentation Tabs */}
                <div className="mb-8">
                    <Tabs value={activeSegment} onValueChange={(v: any) => setActiveSegment(v)}>
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="new">
                                <div className="flex items-center gap-2">
                                    <span>Belum Dibaca</span>
                                    <span className="bg-yellow-100 text-yellow-800 rounded-full px-2 py-0.5 text-xs font-medium">
                                        {counts.new}
                                    </span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="viewed">
                                <div className="flex items-center gap-2">
                                    <span>Sudah Dibaca</span>
                                    <span className="bg-green-100 text-green-800 rounded-full px-2 py-0.5 text-xs font-medium">
                                        {counts.viewed}
                                    </span>
                                </div>
                            </TabsTrigger>
                            <TabsTrigger value="returned">
                                <div className="flex items-center gap-2">
                                    <span>Dikembalikan</span>
                                    <span className="bg-red-100 text-red-800 rounded-full px-2 py-0.5 text-xs font-medium">
                                        {counts.returned}
                                    </span>
                                </div>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>

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
                                    <SelectTrigger>
                                        <SelectValue placeholder="Semua Jenjang" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Jenjang</SelectItem>
                                        <SelectItem value="SD">SD</SelectItem>
                                        <SelectItem value="SMP">SMP</SelectItem>
                                        <SelectItem value="SMA">SMA</SelectItem>
                                        <SelectItem value="SMK">SMK</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div className="w-40 space-y-2">
                                <Label>Jenis Kelamin</Label>
                                <Select value={genderFilter} onValueChange={setGenderFilter}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Semua" />
                                    </SelectTrigger>
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

                {/* Orders Table */}
                <div className="border rounded-lg shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>No. Order</TableHead>
                                <TableHead>Nama Murid</TableHead>
                                <TableHead>Jenjang</TableHead>
                                <TableHead>Tanggal</TableHead>
                                <TableHead className="text-white">Status</TableHead>
                                <TableHead className="text-left text-white">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {getActivePaginator().data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                        Tidak ada order dalam kategori ini
                                    </TableCell>
                                </TableRow>
                            ) : (
                                getActivePaginator().data.map((order) => (
                                    <TableRow key={order.id} className="border-b">
                                        <TableCell className="font-medium">{order.order_number}</TableCell>
                                        <TableCell>{order.nama_murid}</TableCell>
                                        <TableCell>{order.jenjang}</TableCell>
                                        <TableCell>
                                            {format(new Date(order.created_at), 'dd MMM yyyy HH:mm')}
                                        </TableCell>
                                        <TableCell>
                                            {activeSegment === 'new' && (
                                                <span className="px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                                                    Belum Dibaca
                                                </span>
                                            )}
                                            {activeSegment === 'viewed' && (
                                                <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                    Sudah Dibaca
                                                </span>
                                            )}
                                            {activeSegment === 'returned' && (
                                                <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                                                    Dikembalikan
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-left">
                                            <div className="flex justify-start gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openOrderDetail(order)}
                                                    disabled={activeOrderNumbers.includes(order.order_number) || openingDetailId === order.id}
                                                >
                                                    {openingDetailId === order.id ? (
                                                        <>
                                                            <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg> 
                                                        </>
                                                    ) : (
                                                        'Detail'
                                                    )}
                                                </Button>
                                                {activeSegment === 'returned' && (
                                                    <Button
                                                        variant="secondary"
                                                        size="sm"
                                                        onClick={() => handleResendToQc(order.id)}
                                                        disabled={resendingOrderId === order.id}
                                                    >
                                                        {resendingOrderId === order.id ? (
                                                            <>
                                                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                                Mengirim...
                                                            </>
                                                        ) : (
                                                            <>
                                                                <RotateCcw className="w-4 h-4 mr-1" />
                                                                Kirim Ulang
                                                            </>
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
                
                {/* Pagination */}
                {renderPagination()}
            </main>
            
            
            {/* Order Detail Modal */}
            <OrderDetailModal 
                isOpen={isModalOpen}
                onClose={async () => {
                    setIsModalOpen(false);
                    // Notify other clients this order is being closed
                    if (selectedOrder) {
                        await fetch(`/api/trigger/popup-gudang-closed`, {
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
            />
        </div>
        </AppLayout>
    );
}