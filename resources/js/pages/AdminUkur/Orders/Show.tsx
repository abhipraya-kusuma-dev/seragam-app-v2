import { Head, Link } from '@inertiajs/react';
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Home } from 'lucide-react';
import { type PageProps } from '@inertiajs/core';

interface OrderItem {
    id: number;
    nama_item: string;
    jenjang: string;
    jenis_kelamin: string;
    size: string;
}

interface Order {
    id: number;
    order_number: string;
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    created_at: string;
    items: OrderItem[];
}

interface Props extends PageProps {
    order: Order;
}

const OrderShow = ({ order }: Props) => {
    return (
        <div className="container mx-auto py-8">
            <Head title={`Detail Order #${order.order_number}`} />
            
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                    <Home className="w-4 h-4 mr-2" />
                    Dasbor
                </Link>
                <Link 
                    href={route('admin-ukur.orders.index')} 
                    className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Daftar Order
                </Link>
                <h1 className="text-2xl font-bold">Detail Order #{order.order_number}</h1>
            </div>
            
            <div className="border p-6 rounded-lg shadow">
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Informasi Murid</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <p className="text-gray-600">Nama Murid</p>
                            <p className="font-medium">{order.nama_murid}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Jenjang</p>
                            <p className="font-medium">{order.jenjang}</p>
                        </div>
                        <div>
                            <p className="text-gray-600">Jenis Kelamin</p>
                            <p className="font-medium">{order.jenis_kelamin}</p>
                        </div>
                    </div>
                </div>
                
                <div className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Item Pesanan</h2>
                    <div className="border rounded">
                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="p-3 text-left">Nama Item</th>
                                    <th className="p-3 text-left">Jenjang</th>
                                    <th className="p-3 text-left">Jenis Kelamin</th>
                                    <th className="p-3 text-left">Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item: OrderItem) => (
                                    <tr key={item.id} className="border-t">
                                        <td className="p-3">{item.nama_item}</td>
                                        <td className="p-3">{item.jenjang}</td>
                                        <td className="p-3">{item.jenis_kelamin}</td>
                                        <td className="p-3">{item.size}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                
                <div className="flex justify-between">
                    <div>
                        <p className="text-gray-600">Tanggal Order</p>
                        <p className="font-medium">
                            {new Date(order.created_at).toLocaleDateString('id-ID', {
                                day: '2-digit',
                                month: 'long',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderShow;
