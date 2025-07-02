import { Head } from '@inertiajs/react';
import { PageProps, router } from '@inertiajs/core'; 
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { useForm } from '@inertiajs/react';
import { debounce } from 'lodash';
import {
    CheckCircle,
    XCircle,
    Package,
    ClipboardCheck,
    RotateCcw,
    Clock,
    LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import QualityCheckModal from '@/components/qc/QualityCheckModal';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner';

export interface Order {
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
}

export interface OrderItem {
    id: number;
    item_id: number;
    order_id: number;
    order_number: string;
    status: 'in-progress' | 'completed' | 'pending' | 'uncompleted';
    qty_requested: number;
    qty_provided: number;
    created_at: string;
    updated_at: string;
    item: {
        id: number;
        nama_item: string;
        jenjang: string;
        jenis_kelamin: string;
        size: string;
        stock?: {
            id?: number;       // Make optional
            item_id?: number;  // Make optional
            qty: number;
        };
    };
}

export interface Paginator<T> {
    data: T[];
    links: {
        url: string | null;
        label: string;
        active: boolean;
    }[];
    current_page: number;
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
}

interface Props extends PageProps {
    auth: {
        user: {
            username: string;
            role: string;
        };
    };
    inProgressOrders?: Paginator<Order>;
    pendingOrders?: Paginator<Order>;
    completedOrders?: Paginator<Order>;
    returnedOrders?: Paginator<Order>;
    cancelledOrders?: Paginator<Order>;
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

export default function AdminQcDashboard({
    auth,
    inProgressOrders,
    pendingOrders,
    completedOrders,
    returnedOrders,
    cancelledOrders,
    qcStats,
    filters = {}
}: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [openingQcModalId, setOpeningQcModalId] = useState<number | null>(null);
    const perPage = filters?.perPage || 10;
    const [activeTab, setActiveTab] = useState('in-progress');
    const [searchTerm, setSearchTerm] = useState('');
    const [jenjangFilter, setJenjangFilter] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [activeOrderNumbers, setActiveOrderNumbers] = useState<string[]>([]);
    const [modalKey, setModalKey] = useState(Date.now());

    useEcho(
        'qc',
        'OrderReaded',
        (_event: { order: Order }) => {
            if (auth.user?.role === 'admin_qc') {
                router.reload({
                    only: ['inProgressOrders', 'qcStats'],
                });
            }
        }
    );
    
    useEcho(
        'qc',
        'OrderReturnedBack',
        (_event: { order: Order }) => {
            if (auth.user?.role === 'admin_qc') {
                router.reload({
                    only: ['inProgressOrders', 'returnedOrders','qcStats'],
                });
            }
        }
    );
    
    useEcho(
        'qc',
        'StockUpdated',
        (event: { item_id: number; new_stock: number }) => {
            // Update modal if it's open
            if (isModalOpen && selectedOrder) {
                setSelectedOrder(prevOrder => {
                    if (!prevOrder) return prevOrder;
                    
                    return {
                        ...prevOrder,
                        order_items: prevOrder.order_items.map(item => {
                            if (item.item.id === event.item_id) {
                                return {
                                    ...item,
                                    item: {
                                        ...item.item,
                                        stock: {
                                            ...item.item.stock,
                                            qty: event.new_stock
                                        }
                                    }
                                };
                            }
                            return item;
                        })
                    };
                });
            }
        }
    );
    
    useEcho(
        'qc',
        'OrderStatusUpdated',
        (_event: { order: Order }) => { 
            if (auth.user?.role === 'admin_qc') {
                router.reload({
                    only: ['inProgressOrders', 'pendingOrders', 'completedOrders', 'returnedOrders', 'cancelledOrders', 'qcStats'],
                    onSuccess: (page) => {
                        if (isModalOpen && selectedOrder) {
                            const newProps = page.props as unknown as Props;
                            
                            // Combine all fresh order lists
                            const allOrders = [
                                ...(newProps.inProgressOrders?.data || []),
                                ...(newProps.pendingOrders?.data || []),
                                ...(newProps.completedOrders?.data || []),
                                ...(newProps.returnedOrders?.data || []),
                                ...(newProps.cancelledOrders?.data || [])
                            ];
    
                            // Find the updated order
                            const updatedOrderForModal = allOrders.find(o => o.id === selectedOrder.id);
    
                            if (updatedOrderForModal) {
                                setSelectedOrder(updatedOrderForModal);
                                setModalKey(Date.now());
                            }
                        }
                    }
                });
            }
        }
    );
    
    useEcho(
        'qc',
        'TriggerPopupQc',
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

    useEffect(() => {
        const debouncedSearch = debounce(() => {
            router.get(
                '/dashboard',
                {
                    tab: activeTab,
                    search: searchTerm,
                    jenjang: jenjangFilter,
                    gender: genderFilter,
                    perPage: perPage,
                },
                {
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                }
            );
        }, 300);

        debouncedSearch();
        return () => debouncedSearch.cancel();
    }, [activeTab, searchTerm, jenjangFilter, genderFilter, perPage]);

    const handleOpenModal = async (order: Order) => {
        setOpeningQcModalId(order.id);
        try {
            await fetch('/api/trigger/popup-qc-open', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderNumber: order.order_number,
                    modalState: true
                }),
            });
            setSelectedOrder(order);
            setIsModalOpen(true);
        } catch (error) {
            console.error("Failed to open QC modal:", error);
            toast.error("Gagal membuka modal QC.");
        } finally {
            setOpeningQcModalId(null);
        }
    };

    const handleCloseModal = async() => {
        if(selectedOrder){
            await fetch('/api/trigger/popup-qc-closed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderNumber: selectedOrder.order_number,
                    modalState: false
                })
            });
        }
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    const logoutForm = useForm();

    const formatTableDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const inProgressOrdersCount = qcStats?.inProgress || 0;

    const renderPagination = (paginator: Paginator<Order>) => {
        if (!paginator || paginator.data.length === 0) return null;

        const queryParams = {
            tab: activeTab,
            search: searchTerm,
            jenjang: jenjangFilter,
            gender: genderFilter,
            perPage: perPage
        };

        const handlePageClick = (url: string | null) => {
            if (url) {
                router.get(url, queryParams, {
                    preserveState: true,
                    preserveScroll: true,
                });
            }
        };

        return (
            <div className="mt-4 flex items-center justify-between">
                <Pagination className="mt-0">
                    <PaginationContent>
                        <PaginationItem>
                            <PaginationPrevious
                                onClick={() => handlePageClick(paginator.prev_page_url)}
                                aria-disabled={!paginator.prev_page_url}
                                className={!paginator.prev_page_url ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>

                        {paginator.links
                            .filter(link => !['&laquo; Previous', 'Next &raquo;'].includes(link.label))
                            .map((link, index) => (
                                <PaginationItem key={index}>
                                    {link.label === '...' ? (
                                        <span className="px-3 py-1">...</span>
                                    ) : (
                                        <div
                                            onClick={() => handlePageClick(link.url)}
                                            className={cn(
                                                "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors h-10 w-10",
                                                link.url ? "border border-input hover:bg-accent hover:text-accent-foreground cursor-pointer" : "opacity-50 cursor-not-allowed",
                                                link.active && "bg-accent text-accent-foreground"
                                            )}
                                        >
                                            {link.label}
                                        </div>
                                    )}
                                </PaginationItem>
                            ))}

                        <PaginationItem>
                            <PaginationNext
                                onClick={() => handlePageClick(paginator.next_page_url)}
                                aria-disabled={!paginator.next_page_url}
                                className={!paginator.next_page_url ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                        </PaginationItem>
                    </PaginationContent>
                </Pagination>
            </div>
        );
    };
    
    const renderOrderTable = (
        ordersPaginator: Paginator<Order> | undefined,
        statusBadge: React.ReactNode,
        title: string,
        icon: React.ReactNode,
        emptyState: { title: string, description: string }
    ) => {
        if (!ordersPaginator || ordersPaginator.data.length === 0) {
            return (
                <div className="text-center py-8">
                    {icon}
                    <h3 className="text-lg font-semibold mb-2">{emptyState.title}</h3>
                    <p className="text-muted-foreground">{emptyState.description}</p>
                </div>
            );
        }

        const sortedOrders = ordersPaginator.data;

        return (
            <>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>No. Order</TableHead>
                            <TableHead>Nama Murid</TableHead>
                            <TableHead>Jenjang</TableHead>
                            <TableHead>Jenis Kelamin</TableHead>
                            <TableHead>{title.includes("Selesai") ? "Tanggal Selesai" : "Tanggal Update"}</TableHead>
                            <TableHead>Status</TableHead>
                            {(title.includes("Diperiksa") || title.includes("Pending")) && <TableHead>Aksi</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sortedOrders.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-medium">{order.order_number}</TableCell>
                                <TableCell>{order.nama_murid}</TableCell>
                                <TableCell>{order.jenjang}</TableCell>
                                <TableCell>{order.jenis_kelamin}</TableCell>
                                <TableCell>{formatTableDate(order.updated_at)}</TableCell>
                                <TableCell>{statusBadge}</TableCell>
                                {(title.includes("Diperiksa") || title.includes("Pending")) && (
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => handleOpenModal(order)}
                                                className="flex items-center gap-1"
                                                disabled={activeOrderNumbers.includes(order.order_number) || openingQcModalId === order.id}
                                            >
                                                {openingQcModalId === order.id ? (
                                                    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                    </svg>
                                                ) : (
                                                    <>
                                                        <ClipboardCheck className="w-4 h-4" /> Periksa
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                {renderPagination(ordersPaginator)}
            </>
        );
    };

    return (
        <AppLayout>
            <Head title="Dashboard Admin QC" />
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Dashboard Quality Control</h1>
                        <p className="text-muted-foreground">Kontrol kualitas pesanan seragam</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                logoutForm.post('/logout', {
                                    preserveScroll: true,
                                    preserveState: false,
                                });
                            }}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Keluar
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Order Diproses</CardTitle>
                            <Package className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{inProgressOrdersCount}</div>
                            <p className="text-xs text-muted-foreground">Order yang sedang diproses</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Selesai / Pending</CardTitle>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-600" /> /
                                <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-2">
                                <div className="text-2xl font-bold">{qcStats?.completed || 0}</div> /
                                <div className="text-2xl font-bold">{qcStats?.pending || 0}</div>
                            </div>
                            <p className="text-xs text-muted-foreground">Order selesai / Order Pending</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Order Dikembalikan</CardTitle>
                            <RotateCcw className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{qcStats?.returned || 0}</div>
                            <p className="text-xs text-muted-foreground">Order yang dikembalikan</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Order Dibatalkan</CardTitle>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{qcStats?.cancelled || 0}</div>
                            <p className="text-xs text-muted-foreground">Order yang dibatalkan</p>
                        </CardContent>
                    </Card>
                </div>
                
                <Tabs defaultValue="in-progress" className="space-y-6" onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-5">
                         <TabsTrigger value="in-progress" className="flex items-center gap-2">
                             <ClipboardCheck className="w-4 h-4" />
                             Perlu Diperiksa ({inProgressOrders?.total || 0})
                         </TabsTrigger>
                         <TabsTrigger value="completed" className="flex items-center gap-2">
                             <CheckCircle className="w-4 h-4" />
                             Selesai ({completedOrders?.total || 0})
                         </TabsTrigger>
                         <TabsTrigger value="pending" className="flex items-center gap-2">
                             <Package className="w-4 h-4" />
                             Pending ({pendingOrders?.total || 0})
                         </TabsTrigger>
                         <TabsTrigger value="returned" className="flex items-center gap-2">
                             <RotateCcw className="w-4 h-4" />
                             Dikembalikan ({returnedOrders?.total || 0})
                         </TabsTrigger>
                         <TabsTrigger value="cancelled" className="flex items-center gap-2">
                             <XCircle className="w-4 h-4" />
                             Dibatalkan ({cancelledOrders?.total || 0})
                         </TabsTrigger>
                    </TabsList>

                    <Card className="shadow-sm">
                        <CardContent className="pt-6">
                            <div className="flex flex-wrap gap-6 items-end">
                                <div className="flex-1 min-w-[200px] space-y-2">
                                    <Label htmlFor="search-input" className="text-sm font-medium">Cari Order/Murid</Label>
                                    <Input
                                        id="search-input"
                                        type="text"
                                        placeholder="Cari nomor order atau nama murid..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full"
                                    />
                                </div>
                                <div className="w-40 space-y-2">
                                     <Label className="text-sm font-medium">Jenjang</Label>
                                     <Select value={jenjangFilter || undefined} onValueChange={(value) => setJenjangFilter(value === 'all' ? '' : value)}>
                                         <SelectTrigger className="w-full">
                                             <SelectValue placeholder="Semua Jenjang" />
                                         </SelectTrigger>
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
                                     <Label className="text-sm font-medium">Jenis Kelamin</Label>
                                     <Select value={genderFilter || undefined} onValueChange={(value) => setGenderFilter(value === 'all' ? '' : value)}>
                                         <SelectTrigger className="w-full">
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
                    
                    <TabsContent value="in-progress">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardCheck className="w-5 h-5" /> Order Perlu Diperiksa
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Daftar order yang perlu di-QC.</p>
                            </CardHeader>
                            <CardContent>
                                {renderOrderTable(
                                    inProgressOrders,
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">Sedang Diproses</Badge>,
                                    "Order Perlu Diperiksa",
                                    <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />,
                                    { title: "Tidak ada order untuk diperiksa", description: "Semua order sudah selesai di-QC atau belum ada order baru." }
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="completed">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" /> Order Selesai
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Riwayat order yang berhasil melewati proses quality control.</p>
                            </CardHeader>
                            <CardContent>
                                {renderOrderTable(
                                    completedOrders,
                                    <Badge variant="default" className="bg-green-100 text-green-800">Selesai</Badge>,
                                    "Order Selesai",
                                    <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />,
                                    { title: "Belum ada order yang selesai", description: "Order yang sudah di-QC akan muncul di sini." }
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="pending">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-orange-600" /> Order Pending
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Order yang sedang menunggu pemeriksaan stok.</p>
                            </CardHeader>
                            <CardContent>
                                {renderOrderTable(
                                    pendingOrders,
                                    <Badge variant="default" className="bg-orange-100 text-orange-800">Pending</Badge>,
                                    "Order Pending",
                                    <Clock className="w-12 h-12 text-orange-600 mx-auto mb-4" />,
                                    { title: "Tidak ada order yang pending", description: "Order dengan status pending akan muncul di sini." }
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                    
                    <TabsContent value="returned">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <RotateCcw className="w-5 h-5 text-red-600" /> Order Dikembalikan
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Order yang dikembalikan karena barang tidak sesuai.</p>
                            </CardHeader>
                            <CardContent>
                                {renderOrderTable(
                                    returnedOrders,
                                    <Badge variant="destructive" className="bg-red-100 text-red-800">Dikembalikan</Badge>,
                                    "Order Dikembalikan",
                                    <RotateCcw className="w-12 h-12 text-red-600 mx-auto mb-4" />,
                                    { title: "Belum ada order yang dikembalikan", description: "Order yang dikembalikan akan muncul di sini." }
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="cancelled">
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-600" /> Order Dibatalkan
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">Order yang dibatalkan karena kesalahan order.</p>
                            </CardHeader>
                            <CardContent>
                                {renderOrderTable(
                                    cancelledOrders,
                                    <Badge variant="destructive" className="bg-red-800 text-red-100">Dibatalkan</Badge>,
                                    "Order Dibatalkan",
                                    <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />,
                                    { title: "Belum ada order yang dibatalkan", description: "Order yang dibatalkan akan muncul di sini." }
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <QualityCheckModal
                key={modalKey}
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                order={selectedOrder}
            />
        </AppLayout>
    );
}