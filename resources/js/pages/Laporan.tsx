import React, { useState, useEffect } from 'react';
import { Head, Link } from '@inertiajs/react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Download, Loader2, Eye, ArrowLeft } from 'lucide-react';
import axios from 'axios';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import AppLayout from '@/layouts/app-layout';
import { DateRange } from 'react-day-picker';

// --- Type Definitions ---
interface OrderItem {
    id: number;
    item: {
        nama_item: string;
        size: string;
        jenjang: string;
        jenis_kelamin: string;
    };
    qty_requested: number;
    qty_provided: number;
}

interface Order {
    id: number;
    order_number: string;
    nama_murid: string;
    jenjang: string;
    status: 'completed' | 'pending' | 'in-progress' | 'cancelled';
    created_at: string;
    order_items: OrderItem[];
}

interface Stock {
    id: number;
    qty: number;
    item: {
        id: number;
        nama_item: string;
        jenjang: string;
        jenis_kelamin: string;
        size: string;
    };
}

type PreviewData = Order[] | Stock[];

const reportOptions = {
    Orders: [
        { value: 'order_all', label: 'Semua Order' },
        { value: 'order_completed', label: 'Order Selesai' },
        { value: 'order_pending', label: 'Order Tertunda' },
        { value: 'order_in-progress', label: 'Order Dalam Proses' },
    ],
    Stok: [
        { value: 'stock_all', label: 'Semua Stok Item' },
        { value: 'stock_low', label: 'Stok Menipis (<= 10)' },
    ],
};

const jenjangOptions = [
    { value: 'all', label: 'Semua Jenjang' },
    { value: 'SDIT', label: 'SDIT' },
    { value: 'SDS', label: 'SDS' },
    { value: 'SMP', label: 'SMP' },
    { value: 'SMA', label: 'SMA' },
    { value: 'SMK', label: 'SMK' },
];

const jenisKelaminOptions = [
    { value: 'all', label: 'Semua Jenis Kelamin' },
    { value: 'Pria', label: 'Pria' },
    { value: 'Wanita', label: 'Wanita' },
];

// Add type for auth prop
interface User {
  id: number;
  name: string;
  email: string;
  role?: string;
}

interface LaporanPageProps {
  auth: {
    user: User;
  };
}

const LaporanPage = ({ auth }: LaporanPageProps) => {
    const [reportType, setReportType] = useState<string>('');
    const [date, setDate] = useState<DateRange | undefined>();
    const [jenjang, setJenjang] = useState<string>('all');
    const [jenisKelamin, setJenisKelamin] = useState<string>('all');
    const [previewData, setPreviewData] = useState<PreviewData>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const isDateRangeRequired = reportType.startsWith('order');

    const handlePreview = async () => {
        if (!reportType) return;
        setIsLoading(true);
        try {
            const response = await axios.post(route('laporan.preview'), {
                type: reportType,
                startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : null,
                endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : null,
                jenjang: jenjang !== 'all' ? jenjang : null,
                jenisKelamin: jenisKelamin !== 'all' ? jenisKelamin : null,
            });
            setPreviewData(response.data);
        } catch (error) {
            console.error('Error fetching preview:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExport = async () => {
        if (!reportType) return;
        setIsExporting(true);
        try {
            const response = await axios.post(
                route('laporan.export'),
                {
                    type: reportType,
                    startDate: date?.from ? format(date.from, 'yyyy-MM-dd') : null,
                    endDate: date?.to ? format(date.to, 'yyyy-MM-dd') : null,
                    jenjang: jenjang !== 'all' ? jenjang : null,
                    jenisKelamin: jenisKelamin !== 'all' ? jenisKelamin : null,
                },
                { responseType: 'blob' }
            );

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            
            // Enhanced filename to include filters
            let filename = `laporan_${reportType}`;
            if (jenjang !== 'all') filename += `_${jenjang}`;
            if (jenisKelamin !== 'all') filename += `_${jenisKelamin}`;
            filename += `_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`;
            
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();

        } catch (error) {
            console.error('Error exporting file:', error);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        setPreviewData([]);
    }, [reportType, jenjang, jenisKelamin]);

    const renderPreviewTable = () => {
        if (isLoading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                    <p className="ml-2">Memuat Preview...</p>
                </div>
            );
        }

        if (previewData.length === 0) {
            return <p className="text-center text-gray-500 p-8">Tidak ada data untuk ditampilkan. Klik "Lihat Preview" untuk memulai.</p>;
        }

        if (reportType.startsWith('stock')) {
            const stockData = previewData as Stock[];
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nama Item</TableHead>
                            <TableHead>Jenjang</TableHead>
                            <TableHead>Jenis Kelamin</TableHead>
                            <TableHead>Size</TableHead>
                            <TableHead className="text-right">Jumlah Stok</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {stockData.map((stock) => (
                            <TableRow key={stock.id}>
                                <TableCell className="font-medium">{stock.item?.nama_item || 'N/A'}</TableCell>
                                <TableCell>{stock.item?.jenjang || 'N/A'}</TableCell>
                                <TableCell>
                                    <Badge variant={stock.item?.jenis_kelamin === 'Pria' ? 'default' : 'secondary'}>
                                        {stock.item?.jenis_kelamin === 'Pria' ? 'Pria' : 'Wanita'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{stock.item?.size || 'N/A'}</TableCell>
                                <TableCell className="text-right font-bold">{stock.qty}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }

        if (reportType.startsWith('order')) {
            const orderData = previewData as Order[];
            return (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order Number</TableHead>
                            <TableHead>Nama Murid</TableHead>
                            <TableHead>Jenjang</TableHead>
                            <TableHead>Items</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Tanggal</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orderData.map((order) => (
                            <TableRow key={order.id}>
                                <TableCell className="font-mono">{order.order_number}</TableCell>
                                <TableCell>{order.nama_murid}</TableCell>
                                <TableCell>
                                    <Badge variant="outline">{order.jenjang}</Badge>
                                </TableCell>
                                <TableCell>
                                    <ul className="list-disc pl-4 space-y-1">
                                        {order.order_items?.map(item => (
                                            <li key={item.id} className="text-sm">
                                                {item.qty_requested}x {item.item?.nama_item || 'N/A'} 
                                                <span className="text-muted-foreground">
                                                    &nbsp;({item.item?.size || 'N/A'} - {item.item?.jenjang || 'N/A'} - {item.item?.jenis_kelamin === 'Pria' ? 'Pria' : 'Wanita'})
                                                </span>
                                            </li>
                                        )) || <li className="text-sm text-muted-foreground">Tidak ada item</li>}
                                    </ul>
                                </TableCell>
                                <TableCell>
                                    <Badge variant={
                                        order.status === 'completed' ? 'default' :
                                        order.status === 'pending' ? 'destructive' : 'secondary'
                                    }>
                                        {order.status === 'pending'? 'Pending' : order.status === 'completed' ? 'Selesai' : order.status === 'cancelled' ? 'Dibatalkan' : 'Sedang Diproses'}
                                    </Badge>
                                </TableCell>
                                <TableCell>{format(new Date(order.created_at), 'dd MMM yyyy')}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            );
        }
        return null;
    };

    return (
        <AppLayout>
            <Head title="Laporan" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <Link href="/dashboard" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Dasbor
                        </Link>
                        <h2 className="font-semibold text-xl leading-tight">Laporan</h2>
                    </div>
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>Buat Laporan Excel</CardTitle>
                            <CardDescription>
                                Pilih jenis laporan, filter berdasarkan jenjang, jenis kelamin, dan rentang tanggal untuk diekspor ke file Excel.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Report Type Selection */}
                            <div className="space-y-2">
                                <label htmlFor="report-type" className="text-sm font-medium">Jenis Laporan</label>
                                <Select onValueChange={setReportType} value={reportType}>
                                    <SelectTrigger id="report-type">
                                        <SelectValue placeholder="Pilih jenis laporan..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(reportOptions).map(([group, options]) => (
                                            <React.Fragment key={group}>
                                                <p className="px-2 py-1.5 text-sm font-semibold text-gray-500">{group}</p>
                                                {options.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filters Section */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="jenjang" className="text-sm font-medium">Filter Jenjang</label>
                                    <Select onValueChange={setJenjang} value={jenjang}>
                                        <SelectTrigger id="jenjang">
                                            <SelectValue placeholder="Pilih jenjang..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jenjangOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="jenis-kelamin" className="text-sm font-medium">Filter Jenis Kelamin</label>
                                    <Select onValueChange={setJenisKelamin} value={jenisKelamin}>
                                        <SelectTrigger id="jenis-kelamin">
                                            <SelectValue placeholder="Pilih jenis kelamin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {jenisKelaminOptions.map(option => (
                                                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Date Range Selection */}
                            <div className={cn("space-y-2", !isDateRangeRequired && "opacity-50 pointer-events-none")}>
                                <label htmlFor="date-range" className="text-sm font-medium">Rentang Tanggal</label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date-range"
                                            variant={"outline"}
                                            className={cn(
                                                "w-full justify-start text-left font-normal",
                                                !date && "text-muted-foreground"
                                            )}
                                            disabled={!isDateRangeRequired}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {date?.from ? (
                                                date.to ? (
                                                    <>
                                                        {format(date.from, "LLL dd, y")} -{" "}
                                                        {format(date.to, "LLL dd, y")}
                                                    </>
                                                ) : (
                                                    format(date.from, "LLL dd, y")
                                                )
                                            ) : (
                                                <span>Pilih rentang tanggal</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={date?.from}
                                            selected={date}
                                            onSelect={setDate}
                                            numberOfMonths={2}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {!isDateRangeRequired && (
                                    <p className="text-xs text-muted-foreground">Rentang tanggal hanya berlaku untuk laporan order.</p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end space-x-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={handlePreview}
                                    disabled={!reportType || isLoading}
                                >
                                    {isLoading ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Eye className="mr-2 h-4 w-4" />
                                    )}
                                    Lihat Preview
                                </Button>
                                <Button
                                    onClick={handleExport}
                                    disabled={!reportType || isExporting}
                                >
                                    {isExporting ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : (
                                        <Download className="mr-2 h-4 w-4" />
                                    )}
                                    Export ke Excel
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Preview Data</CardTitle>
                            <CardDescription>
                                Ini adalah preview data yang akan diekspor berdasarkan filter yang dipilih.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {renderPreviewTable()}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
};

export default LaporanPage;