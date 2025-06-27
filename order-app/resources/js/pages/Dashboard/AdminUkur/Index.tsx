import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import AppSidebarLayout from '@/layouts/app/app-sidebar-layout';
import { type BreadcrumbItem } from '@/types';
import { usePage } from '@inertiajs/react';
import { PageProps } from '@inertiajs/core';
import { useForm } from '@inertiajs/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, List, BarChart, User, LogOut } from 'lucide-react';
import { Link } from '@inertiajs/react';

interface Props extends PageProps {
    auth: {
        user: {
            username: string;
            role: string;
        };
    };
    orderStats: {
        totalOrders: number;
        inProgressOrders: number; // Changed from pendingOrders to inProgressOrders
        completedOrders: number;
    };
    recentOrders: {
        id: number;
        order_number: string;
        nama_murid: string;
        jenjang: string;
        created_at: string;
        status: string;
    }[];
}

export default function AdminUkurDashboard() {
    const { auth, orderStats, recentOrders } = usePage<Props>().props;
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' }
    ];
    const logoutForm = useForm();

    return (
        <AppSidebarLayout breadcrumbs={breadcrumbs}>
            <Head title="Dasbor Admin Ukur" />
            <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-2xl font-bold">Dasbor Admin Ukur</h1>
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

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-primary hover:border-primary/80 transition-colors">
                        <Link href={route('admin-ukur.orders.create')}>
                            <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                                <div className="bg-primary/10 p-3 rounded-full mb-4">
                                    <Plus className="h-8 w-8 text-primary" />
                                </div>
                                <CardTitle className="mb-2">Buat Order Baru</CardTitle>
                                <CardDescription className="mb-4">
                                    Buat order seragam baru untuk murid
                                </CardDescription>
                                <Button className="mt-2">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Buat Order
                                </Button>
                            </CardContent>
                        </Link>
                    </Card>

                    <Card className="border-blue-500 hover:border-blue-500/80 transition-colors">
                        <Link href={route('admin-ukur.orders.index')}>
                            <CardContent className="p-6 flex flex-col items-center justify-center h-full text-center">
                                <div className="bg-blue-500/10 p-3 rounded-full mb-4">
                                    <List className="h-8 w-8 text-blue-500" />
                                </div>
                                <CardTitle className="mb-2">Kelola Order</CardTitle>
                                <CardDescription className="mb-4">
                                    Lihat, edit, atau cetak order yang sudah dibuat
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
                        <Link href={route('admin-ukur.orders.index')}>
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
                                            <th className="p-4 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentOrders.length === 0 ? (
                                            <tr className="border-b hover:bg-muted/50">
                                                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                                                    Belum ada order
                                                </td>
                                            </tr>
                                        ) : (
                                            recentOrders.map((order) => (
                                                <tr key={order.id} className="border-b hover:bg-muted/50">
                                                    <td className="p-4 font-medium">{order.order_number}</td>
                                                    <td className="p-4">{order.nama_murid}</td>
                                                    <td className="p-4">{order.jenjang}</td>
                                                    <td className="p-4">{new Date(order.created_at).toLocaleDateString('id-ID')}</td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                                            order.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                                            'bg-yellow-100 text-yellow-800'
                                                        }`}>
                                                            {order.status === 'completed' ? 'Selesai' :
                                                             order.status === 'in-progress' ? 'Sedang Diproses' : 
                                                             order.status === 'cancelled' ? 'Dibatalkan' : 'Pending'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-right">
                                                        <Link href={route('admin-ukur.orders.show', { order: order.id })}>
                                                            <Button variant="outline" size="sm">
                                                                Detail
                                                            </Button>
                                                        </Link>
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
        </AppSidebarLayout>
    );
}