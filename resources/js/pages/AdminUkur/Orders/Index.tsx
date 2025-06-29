import { Head, Link } from '@inertiajs/react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Plus } from 'lucide-react';
import { router } from '@inertiajs/react';
import { 
  Pagination, 
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from '@/components/ui/pagination';
import AppLayout from '@/layouts/app-layout';
import { cn } from '@/lib/utils';

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
    links: PaginationLink[]; // Made required
}

interface Props {
    orders: {
        data: Order[];
        meta: PaginationMeta; // Made required
        links: { // Made required
            first: string | null;
            last: string | null;
            prev: string | null;
            next: string | null;
        };
    };
}

const OrderIndex = ({ orders }: Props) => {
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
                        {orders.data.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    Belum ada order
                                </TableCell>
                            </TableRow>
                        ) : (
                            orders.data.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">{order.order_number}</TableCell>
                                    <TableCell>{order.nama_murid}</TableCell>
                                    <TableCell>{order.jenjang}</TableCell>
                                    <TableCell>{order.jenis_kelamin}</TableCell>
                                    <TableCell>
                                        {new Date(order.created_at).toLocaleDateString('id-ID', {
                                            day: '2-digit',
                                            month: 'short',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <span className={`px-2 py-1 rounded text-xs ${
                                            order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                            order.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                                            order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                            'bg-yellow-100 text-yellow-800'
                                        }`}>
                                            {order.status === 'completed' ? 'Selesai' : 
                                            order.status === 'in-progress' ? 'Sedang Diproses' : 
                                            order.status === 'cancelled' ? 'Dibatalkan' : 
                                            'Pending'}
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
                {/* Pagination */}
                {orders.meta.total > 0 && (
                <div className="flex items-center justify-between border-t pt-4">
                    <Pagination className="mt-0">
                        <PaginationContent>
                            <PaginationItem>
                                {orders.links.prev ? (
                                    <div
                                        onClick={() => router.get(orders.links.prev!, {}, {
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

                            {orders.meta.links.slice(1, -1).map((link, index) => (
                                <PaginationItem key={index}>
                                    {link.url ? (
                                        <div
                                            onClick={() => router.get(link.url!, {}, {
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
                                {orders.links.next ? (
                                    <div
                                        onClick={() => router.get(orders.links.next!, {}, {
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
            )}
            </div>
        </div>
        </AppLayout>
    );
};

export default OrderIndex;