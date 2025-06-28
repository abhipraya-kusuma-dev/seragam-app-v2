import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { PageProps, router } from '@inertiajs/core';
import { Link } from '@inertiajs/react';
import { useForm } from '@inertiajs/react';
import { debounce } from 'lodash';
import {
    CheckCircle,
    XCircle,
    Package,
    ClipboardCheck,
    RotateCcw,
    Eye,
    FileText,
    TrendingUp,
    Users,
    Clock,
    LogOut,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import { useState, useEffect } from 'react';
import QualityCheckModal from '@/components/qc/QualityCheckModal';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useEcho } from '@laravel/echo-react';
import { toast } from 'sonner'; // <-- Import toast for error handling

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
            id: number;
            item_id: number;
            qty: number;
        };
    };
}

interface Props extends PageProps {
    auth: {
        user: {
            username: string;
            role: string;
        };
    };
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

export default function AdminQcDashboard({
    auth,
    inProgressOrders = null,
    pendingOrders = null,
    completedOrders = null,
    returnedOrders = null,
    cancelledOrders = null,
    qcStats,
    filters = {}
}: Props) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [openingQcModalId, setOpeningQcModalId] = useState<number | null>(null); // <-- ADDED
    const perPage = filters?.perPage || 10;
    const [activeTab, setActiveTab] = useState('in-progress');
    const [searchTerm, setSearchTerm] = useState('');
    const [jenjangFilter, setJenjangFilter] = useState('');
    const [genderFilter, setGenderFilter] = useState('');
    const [activeOrderNumbers, setActiveOrderNumbers] = useState<string[]>([]);

    // --- useEcho IMPLEMENTATION ---
    useEcho(
        'qc',
        'OrderReaded',
        (event: { order: Order }) => {
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
        (event: { order: Order }) => {
            if (auth.user?.role === 'admin_qc') {
                router.reload({
                    only: ['inProgressOrders', 'qcStats'],
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
    // --- END of useEcho IMPLEMENTATION ---

    useEffect(() => {
        // Using debounce to avoid sending a request on every keystroke
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
                    replace: true, // Avoids polluting browser history
                }
            );
        }, 300); // 300ms delay
    
        debouncedSearch();
    
        // Cleanup function to cancel the debounce on component unmount
        return () => debouncedSearch.cancel();
    
    }, [activeTab, searchTerm, jenjangFilter, genderFilter, perPage]);

    const handleOpenModal = async (order: Order) => {
        setOpeningQcModalId(order.id); // <-- ADDED: Set loading state
        try {
            await fetch('/api/trigger/popup-qc-open', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
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
            setOpeningQcModalId(null); // <-- ADDED: Reset loading state
        }
    };

    const handleCloseModal = async() => {
        if(selectedOrder){
            await fetch('/api/trigger/popup-qc-closed', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    orderNumber: selectedOrder.order_number,
                    modalState: false
                })
            })
        }
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
    };

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard QC', href: '/admin-qc/dashboard' }
    ];
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

    const getStatusBadge = (status: string) => {
        const statusConfig = {
            'in-progress': { label: 'Sedang Diproses', className: 'bg-blue-100 text-blue-800 border-blue-200' },
            'completed': { label: 'Selesai', className: 'bg-green-100 text-green-800 border-green-200' },
            'pending': { label: 'Menunggu Stok', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
            'cancelled': { label: 'Dibatalkan', className: 'bg-red-100 text-red-800 border-red-200' },
            'uncompleted': { label: 'Belum Lengkap', className: 'bg-gray-100 text-gray-800 border-gray-200' }
        };

        const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['in-progress'];

        return (
            <Badge variant="outline" className={`flex items-center gap-1 ${config.className}`}>
                {config.label}
            </Badge>
        );
    };

    const handleQcOrder = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const handleViewOrder = (orderId: number) => {
        window.location.href = `/admin-qc/orders/${orderId}`;
    };

    const inProgressOrdersCount = qcStats?.inProgress || 0;




    // Helper function to render pagination
    const renderPagination = (paginator: any, tabName: string) => {
        if (!paginator || paginator.data.length === 0) return null;

        const queryParams = {
            tab: activeTab,
            search: searchTerm,
            jenjang: jenjangFilter,
            gender: genderFilter,
            perPage: perPage
        };

        return (
            <div className="mt-4 flex items-center justify-between">
                <Pagination className="mt-0">
                    <PaginationContent>
                        <PaginationItem>
                            {paginator.prev_page_url ? (
                                <div
                                    onClick={() => router.get(paginator.prev_page_url, queryParams, {
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
                            .filter((link: any) => !['&laquo; Previous', 'Next &raquo;'].includes(link.label))
                            .map((link: any, index: number) => {
                                if (link.label === '...') {
                                    return (
                                        <PaginationItem key={index}>
                                            <span className="px-3 py-1">...</span>
                                        </PaginationItem>
                                    );
                                }

                                return (
                                    <PaginationItem key={index}>
                                        {link.url ? (
                                            <div
                                                onClick={() => router.get(link.url, queryParams, {
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
                                );
                            })}

                        <PaginationItem>
                            {paginator.next_page_url ? (
                                <div
                                    onClick={() => router.get(paginator.next_page_url, queryParams, {
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
        );
    };

    return (
        <AppLayout>
            <Head title="Dashboard Admin QC" />
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
                {/* Header */}
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
                            <LogOut className="w-4 h-4" />
                            Keluar
                        </Button>
                    </div>
                </div>

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Order Diproses</CardTitle>
                            <Package className="h-4 w-4 text-blue-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{inProgressOrdersCount}</div>
                            <p className="text-xs text-muted-foreground">
                                Order yang sedang diproses
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Order Selesai / Pending</CardTitle>
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
                            <p className="text-xs text-muted-foreground">
                                Order selesai / Order Pending
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Order Dikembalikan</CardTitle>
                            <RotateCcw className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{qcStats?.returned || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Order dikembalikan
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Order Dibatalkan</CardTitle>
                            <XCircle className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{qcStats?.cancelled || 0}</div>
                            <p className="text-xs text-muted-foreground">
                                Order Dibatalkan
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Tabs */}
                <Tabs defaultValue="in-progress" className="space-y-6" onValueChange={handleTabChange}>
                    <TabsList className="grid w-full grid-cols-5">
                        <TabsTrigger value="in-progress" className="flex items-center gap-2">
                            <ClipboardCheck className="w-4 h-4" />
                            Order Perlu Diperiksa ({inProgressOrders?.total || 0})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Order Selesai ({completedOrders?.total || 0})
                        </TabsTrigger>
                        <TabsTrigger value="pending" className="flex items-center gap-2">
                            <Package className="w-4 h-4" />
                            Order Pending ({pendingOrders?.total || 0})
                        </TabsTrigger>
                        <TabsTrigger value="returned" className="flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Order Dikembalikan ({returnedOrders?.total || 0})
                        </TabsTrigger>
                        <TabsTrigger value="cancelled" className="flex items-center gap-2">
                            <XCircle className="w-4 h-4" />
                            Order Dibatalkan ({cancelledOrders?.total || 0})
                        </TabsTrigger>
                    </TabsList>

                    {/* Filter Section */}
                    <Card className="shadow-sm">
                        <CardContent>
                            <div className="flex flex-wrap gap-6 items-end">
                                <div className="flex-1 min-w-[200px] space-y-2">
                                    <Label htmlFor="search-input" className="text-sm font-medium">
                                        Cari Order/Murid
                                    </Label>
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
                                    <Select value={jenjangFilter || undefined} onValueChange={(value) => setJenjangFilter(value || '')}>
                                        <SelectTrigger className="w-full">
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
                                    <Label className="text-sm font-medium">Jenis Kelamin</Label>
                                    <Select value={genderFilter || undefined} onValueChange={(value) => setGenderFilter(value || '')}>
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

                    {/* Order Perlu Diperiksa Tab */}
                    <TabsContent value="in-progress">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <ClipboardCheck className="w-5 h-5" />
                                    Order Perlu Diperiksa ({inProgressOrders?.data?.length || 0})
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Daftar order yang perlu di-QC
                                </p>
                            </CardHeader>
                            <CardContent>
                                {inProgressOrders?.data?.length > 0 ? (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>No. Order</TableHead>
                                                    <TableHead>Nama Murid</TableHead>
                                                    <TableHead>Jenjang</TableHead>
                                                    <TableHead>Jenis Kelamin</TableHead>
                                                    <TableHead>Tanggal Order</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {inProgressOrders.data
                                                    .sort((a: Order, b: Order) =>
                                                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                                                    )
                                                    .map((order: Order) => (
                                                        <TableRow key={order.id}>
                                                            <TableCell className="font-medium">{order.order_number}</TableCell>
                                                            <TableCell>{order.nama_murid}</TableCell>
                                                            <TableCell>{order.jenjang}</TableCell>
                                                            <TableCell>{order.jenis_kelamin}</TableCell>
                                                            <TableCell>
                                                                {formatTableDate(order.created_at)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="secondary" className="bg-blue-100 text-blue-800">Sedang Diproses</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleOpenModal(order)}
                                                                        className="flex items-center gap-1"
                                                                        disabled={activeOrderNumbers.includes(order.order_number) || openingQcModalId === order.id}
                                                                    >
                                                                        {openingQcModalId === order.id ? (
                                                                            <>
                                                                                <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                                </svg>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <ClipboardCheck className="w-4 h-4" />
                                                                                Periksa
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(inProgressOrders, 'inProgressPage')}
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">Tidak ada order yang perlu di-QC</h3>
                                        <p className="text-muted-foreground">Semua order sudah selesai di-QC atau belum ada order baru</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Order Selesai Tab */}
                    <TabsContent value="completed">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    Order Selesai ({completedOrders?.data?.length || 0})
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Riwayat order yang sudah berhasil melewati proses quality control
                                </p>
                            </CardHeader>
                            <CardContent>
                                {completedOrders?.data?.length > 0 ? (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>No. Order</TableHead>
                                                    <TableHead>Nama Murid</TableHead>
                                                    <TableHead>Jenjang</TableHead>
                                                    <TableHead>Jenis Kelamin</TableHead>
                                                    <TableHead>Tanggal Selesai</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {completedOrders.data
                                                    .sort((a: Order, b: Order) =>
                                                        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                                                    )
                                                    .map((order: Order) => (
                                                        <TableRow key={order.id}>
                                                            <TableCell>{order.order_number}</TableCell>
                                                            <TableCell>{order.nama_murid}</TableCell>
                                                            <TableCell>{order.jenjang}</TableCell>
                                                            <TableCell>{order.jenis_kelamin}</TableCell>
                                                            <TableCell>
                                                                {formatTableDate(order.updated_at)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="default" className="bg-green-100 text-green-800">Selesai</Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(completedOrders, 'completedPage')}
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">Belum ada order yang selesai</h3>
                                        <p className="text-muted-foreground">Order yang sudah di-QC akan muncul di sini</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Order Pending Tab */}
                    <TabsContent value="pending">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-orange-600" />
                                    Order Pending ({pendingOrders?.data?.length || 0})
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Order yang sedang menunggu pemeriksaan
                                </p>
                            </CardHeader>
                            <CardContent>
                                {pendingOrders?.data?.length > 0 ? (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>No. Order</TableHead>
                                                    <TableHead>Nama Murid</TableHead>
                                                    <TableHead>Jenjang</TableHead>
                                                    <TableHead>Jenis Kelamin</TableHead>
                                                    <TableHead>Tanggal Pending</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead>Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {pendingOrders.data
                                                    .sort((a: Order, b: Order) =>
                                                        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                                                    )
                                                    .map((order: Order) => (
                                                        <TableRow key={order.id}>
                                                            <TableCell>{order.order_number}</TableCell>
                                                            <TableCell>{order.nama_murid}</TableCell>
                                                            <TableCell>{order.jenjang}</TableCell>
                                                            <TableCell>{order.jenis_kelamin}</TableCell>
                                                            <TableCell>
                                                                {formatTableDate(order.updated_at)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="default" className="bg-orange-100 text-orange-800">Pending</Badge>
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex gap-2">
                                                                    <Button
                                                                        size="sm"
                                                                        onClick={() => handleOpenModal(order)}
                                                                        className="flex items-center gap-1"
                                                                        disabled={order.status === 'cancelled'}
                                                                    >
                                                                        <ClipboardCheck className="w-4 h-4" />
                                                                        Periksa
                                                                    </Button>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(pendingOrders, 'pendingPage')}
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <Clock className="w-12 h-12 text-orange-600 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">Order yang sedang menunggu stok</h3>
                                        <p className="text-muted-foreground">Order dengan status pending akan muncul di sini</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Order Dikembalikan Tab */}
                    <TabsContent value="returned">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <RotateCcw className="w-5 h-5 text-red-600" />
                                    Order Dikembalikan ({returnedOrders?.data?.length || 0})
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Order yang dikembalikan karena barang yang diterima tidak sesuai
                                </p>
                            </CardHeader>
                            <CardContent>
                                {returnedOrders?.data?.length > 0 ? (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>No. Order</TableHead>
                                                    <TableHead>Nama Murid</TableHead>
                                                    <TableHead>Jenjang</TableHead>
                                                    <TableHead>Jenis Kelamin</TableHead>
                                                    <TableHead>Tanggal Dikembalikan</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {returnedOrders.data
                                                    .sort((a: Order, b: Order) =>
                                                        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                                                    )
                                                    .map((order: Order) => (
                                                        <TableRow key={order.id}>
                                                            <TableCell>{order.order_number}</TableCell>
                                                            <TableCell>{order.nama_murid}</TableCell>
                                                            <TableCell>{order.jenjang}</TableCell>
                                                            <TableCell>{order.jenis_kelamin}</TableCell>
                                                            <TableCell>
                                                                {formatTableDate(order.updated_at)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="destructive" className="bg-red-100 text-red-800">Dikembalikan</Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(returnedOrders, 'returnedPage')}
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <RotateCcw className="w-12 h-12 text-red-600 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">Belum ada order yang dikembalikan</h3>
                                        <p className="text-muted-foreground">Order yang dikembalikan akan muncul di sini</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Order Dibatalkan Tab */}
                    <TabsContent value="cancelled" className="mb-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <XCircle className="w-5 h-5 text-red-600" />
                                    Order Dibatalkan ({cancelledOrders?.data?.length || 0})
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    Order yang dibatalkan karna kesalahan order
                                </p>
                            </CardHeader>
                            <CardContent>
                                {cancelledOrders?.data?.length > 0 ? (
                                    <>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>No. Order</TableHead>
                                                    <TableHead>Nama Murid</TableHead>
                                                    <TableHead>Jenjang</TableHead>
                                                    <TableHead>Jenis Kelamin</TableHead>
                                                    <TableHead>Tanggal Pembatalan</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {cancelledOrders.data
                                                    .sort((a: Order, b: Order) =>
                                                        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
                                                    )
                                                    .map((order: Order) => (
                                                        <TableRow key={order.id}>
                                                            <TableCell>{order.order_number}</TableCell>
                                                            <TableCell>{order.nama_murid}</TableCell>
                                                            <TableCell>{order.jenjang}</TableCell>
                                                            <TableCell>{order.jenis_kelamin}</TableCell>
                                                            <TableCell>
                                                                {formatTableDate(order.updated_at)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <Badge variant="destructive" className="bg-red-800 text-red-100">Dibatalkan</Badge>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                            </TableBody>
                                        </Table>
                                        {renderPagination(cancelledOrders, 'cancelledPage')}
                                    </>
                                ) : (
                                    <div className="text-center py-8">
                                        <XCircle className="w-12 h-12 text-red-600 mx-auto mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">Belum ada order yang dibatalkan</h3>
                                        <p className="text-muted-foreground">Order yang dibatalkan akan muncul di sini</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Quality Check Modal */}
            <QualityCheckModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                order={selectedOrder}
            />
        </AppLayout>
    );
}