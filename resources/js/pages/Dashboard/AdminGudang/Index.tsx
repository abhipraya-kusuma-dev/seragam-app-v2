import { Head } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@inertiajs/core';
import { useForm, Link } from '@inertiajs/react';
import { 
    Package, 
    Bell, 
    CheckCircle, 
    RotateCcw,
    LogOut,
    List,
    ChartArea,
    ShoppingBag
} from 'lucide-react';
import { useState, useEffect } from 'react';
import OrderDetailModal from '@/components/order/OrderDetailModal';
import { Order } from '@/types/order';
import { useEcho } from '@laravel/echo-react';
import { Toaster, toast } from 'sonner';
import { router } from '@inertiajs/react';

interface Props extends PageProps {
    auth: {
        user: {
            username: string;
            role: string;
        };
    };
    orderStats: {
        belum_terbaca: number;
        sudah_terbaca: number;
        dikembalikan: number;
    };
    recentOrders: Order[]; // Use the Order type
}

export default function AdminGudangDashboard() {
    const { auth, orderStats: initialOrderStats, recentOrders: initialRecentOrders } = usePage<Props>().props;
    const logoutForm = useForm();

    // State for orders and stats
    const [recentOrders, setRecentOrders] = useState<Order[]>(initialRecentOrders);
    const [orderStats, setOrderStats] = useState(initialOrderStats);

    // Use Echo with proper typing
    useEcho(
        'gudang',
        'NewOrderCreated',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_gudang') {
                // Update recent orders (prepend new order)
                setRecentOrders(prev => [
                    event.order, 
                    ...prev.slice(0, 4) // Keep only first 5 orders total
                ]);
                
                // Update stats
                setOrderStats(prev => ({
                    ...prev,
                    belum_terbaca: prev.belum_terbaca + 1
                }));
            }
        }
    );


    // State for modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    const openOrderDetail = (order: Order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    return (
        <AppLayout>
            <Head title="Dasbor Admin Gudang" />
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Dasbor Admin Gudang</h1>
                        <p className="text-muted-foreground mt-1">
                            Selamat datang kembali, <span className="font-semibold">{auth.user.username}</span>
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => {
                                logoutForm.post('/logout', {
                                    preserveScroll: true,
                                    preserveState: false,
                                });
                            }}
                            className="flex items-center gap-2"
                        >
                            <LogOut className="w-4 h-4" />
                            Keluar
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <Card className="border-yellow-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-medium">Order Belum Terbaca</CardTitle>
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200 px-2 py-1">
                                    {orderStats.belum_terbaca}
                                </Badge>
                            </div>
                            <Bell className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{orderStats.belum_terbaca}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Perlu segera diproses
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-green-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-medium">Order Sudah Terbaca</CardTitle>
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200 px-2 py-1">
                                    {orderStats.sudah_terbaca}
                                </Badge>
                            </div>
                            <CheckCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{orderStats.sudah_terbaca}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Sedang diproses
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-red-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-sm font-medium">Order Dikembalikan</CardTitle>
                                <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200 px-2 py-1">
                                    {orderStats.dikembalikan}
                                </Badge>
                            </div>
                            <RotateCcw className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{orderStats.dikembalikan}</div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Perlu diperbaiki
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-primary hover:border-primary/80 transition-colors">
                        <Link href={route('admin-gudang.items.index')}>
                            <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                                <div className="bg-primary/10 p-3 rounded-full mb-4">
                                    <Package className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="mb-2">Kelola Item</CardTitle>
                                <CardDescription className="mb-4">
                                    Kelola semua item seragam dalam gudang
                                </CardDescription>
                                <Button className="mt-2">
                                    <Package className="w-4 h-4 mr-2" />
                                    Kelola Item
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="border-blue-500 hover:border-blue-500/80 transition-colors">
                        <Link href={route('admin-gudang.orders.index')}>
                            <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                                <div className="bg-blue-500/10 p-3 rounded-full mb-4">
                                    <ShoppingBag className="h-8 w-8 text-blue-500" />
                                </div>
                                <CardTitle className="mb-2">Kelola Order</CardTitle>
                                <CardDescription className="mb-4">
                                    Lihat dan proses order dari Admin Ukur
                                </CardDescription>
                                <Button variant="secondary" className="mt-2">
                                    <List className="w-4 h-4 mr-2" />
                                    Lihat Semua Order
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>
                </div>

                {/* Recent Orders */}
                <div className="mt-12">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">Order Terbaru</h2>
                        <Link href={route('admin-gudang.orders.index')}>
                            <Button variant="link" className="text-primary">
                                Lihat Semua
                            </Button>
                        </Link>
                    </div>
                    <Card>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="p-4 text-left">No. Order</th>
                                            <th className="p-4 text-left">Nama Murid</th>
                                            <th className="p-4 text-left">Jenjang</th>
                                            <th className="p-4 text-left">Tanggal</th>
                                            <th className="p-4 text-left">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.length === 0 ? (
                                            <tr className="border-b hover:bg-muted/50">
                                                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    Belum ada order masuk
                                                </td>
                                            </tr>
                                        ) : (
                                            recentOrders.map((order) => (
                                                <tr key={order.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-4 font-medium">{order.order_number}</td>
                                                    <td className="p-4">{order.nama_murid}</td>
                                                    <td className="p-4">{order.jenjang}</td>
                                                    <td className="p-4">
                                                        {new Date(order.created_at).toLocaleDateString('id-ID', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                                            order.status === 'sudah-terbaca' ? 'bg-green-100 text-green-800' :
                                                            order.status === 'dikembalikan' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {order.status === 'sudah-terbaca' ? 'Sudah Terbaca' :
                                                             order.status === 'dikembalikan' ? 'Dikembalikan' : 'Belum Terbaca'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* Order Detail Modal */}
            <OrderDetailModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                order={selectedOrder}
            />
        </AppLayout>
    );
}