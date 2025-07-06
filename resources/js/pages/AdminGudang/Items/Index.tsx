import { Head, router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect, useMemo } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Plus, Upload, RotateCcw, Edit, AlertCircle, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from '@inertiajs/react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';
import { useEcho } from '@laravel/echo-react';
import { usePage } from '@inertiajs/react';
import { type PageProps } from '@inertiajs/core';

// Utility function to capitalize first letter of each word
const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

interface Props extends PageProps {
    auth: {
        user: {
            username: string;
            role: string;
        };
    };
    items: {
        data: Array<{
            id: number;
            nama_item: string;
            jenjang: string;
            jenis_kelamin: string;
            size: string;
            stock?: {
                qty: number;
            };
        }>;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
        current_page: number;
        last_page: number;
    };
    lowStockItems: Array<{ // Add this prop for global low stock items
        id: number;
        nama_item: string;
        jenjang: string;
        jenis_kelamin: string;
        size: string;
        qty: number;
    }>;
    filters: {
        search?: string;
        jenjang?: string;
        jenis_kelamin?: string;
    };
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
    templateUrl: string;
}

const ItemsIndex = ({ 
    items, 
    filters, 
    jenjangOptions, 
    jenisKelaminOptions, 
    templateUrl,
    lowStockItems: globalLowStockItems // Rename to avoid confusion
}: Props) => {
    const [search, setSearch] = useState(filters.search || '');
    const [jenjang, setJenjang] = useState(filters.jenjang || 'all');
    const [jenisKelamin, setJenisKelamin] = useState(filters.jenis_kelamin || 'all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isResetAllDialogOpen, setIsResetAllDialogOpen] = useState(false);
    const [itemToReset, setItemToReset] = useState<number | null>(null);
    const [itemToDelete, setItemToDelete] = useState<number | null>(null);
    const [isLowStockDialogOpen, setIsLowStockDialogOpen] = useState(false);
    
    // Add processing state from useForm
    const { data, setData, post, errors, reset, progress, processing } = useForm({
        excel_file: null as File | null,
    });

    const { auth } = usePage<Props>().props;

    // Create a Set of low stock item IDs for quick lookup
    const lowStockItemIds = useMemo(() => 
        new Set(globalLowStockItems.map(item => item.id)), 
        [globalLowStockItems]
    );

    // Add Echo listener for stock reduction events
    useEcho(
        'gudang',
        'QtyReducedGudang',
        () => {
            if (auth.user?.role === 'admin_gudang') {
                router.reload({ only: ['items', 'lowStockItems'] });
            }
        }
    );

    useEcho(
        'gudang',
        'ItemAdded',
        () => {
            if (auth.user?.role === 'admin_gudang') {
                router.reload({ only: ['items', 'lowStockItems'] });
            }
        }
    );

    useEcho(
        'gudang',
        'ItemDeleted',
        () => {
            if (auth.user?.role === 'admin_gudang') {
                router.reload({ only: ['items', 'lowStockItems'] });
            }
        }
    );

    useEffect(() => {
        const params = {
            search: search || undefined,
            jenjang: jenjang === 'all' ? undefined : jenjang,
            jenis_kelamin: jenisKelamin === 'all' ? undefined : jenisKelamin,
        };

        const handler = setTimeout(() => {
            router.get('/admin/gudang/items', params, {
                preserveState: true,
                preserveScroll: true,
                replace: true,
            });
        }, 300);

        return () => clearTimeout(handler);
    }, [search, jenjang, jenisKelamin]);

    const handleDownloadTemplate = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const toastId = toast.loading('Sedang menyiapkan file template...');

        try {
            const response = await fetch(templateUrl);
            if (!response.ok) {
                throw new Error('Gagal mengambil file dari server.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = 'template_stok.xlsx';
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Template berhasil diunduh!', { id: toastId });
        } catch (error) {
            console.error('Download template error:', error);
            toast.error('Gagal menyiapkan file.', {
                description: 'Terjadi kesalahan saat mencoba mengunduh.',
                id: toastId,
            });
        }
    };

    const handleBulkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const toastId = toast.loading('Mengunggah file dan memproses stok...');

        post(route('admin-gudang.items.bulk-update-stock'), {
            preserveScroll: true,
            onSuccess: () => {
                toast.success('Berhasil mengupdate stok', { id: toastId });
                setIsDialogOpen(false);
                reset(); 
            },
            onError: (errors) => {
                if (errors.excel_file) {
                    toast.error(errors.excel_file, { id: toastId });
                } else {
                    toast.error('Terjadi kesalahan validasi. Mohon periksa kembali file Anda.', { id: toastId });
                }
            },
        });
    }

    const handleResetAll = () => {
        router.post(route('admin-gudang.stock.reset-all'), {}, {
            onSuccess: () => setIsResetAllDialogOpen(false),
        });
    };

    const handleResetItem = (itemId: number) => {
        router.post(route('admin-gudang.stock.reset', { item: itemId }), {}, {
            onSuccess: () => setItemToReset(null),
        });
    };

    const handleDeleteItem = (itemId: number) => {
        router.delete(route('admin-gudang.items.destroy', { item: itemId }), {
            preserveScroll: true,
            onSuccess: () => {
                setItemToDelete(null);
                toast.success('Item berhasil dihapus.');
            }
        });
    };

    return (
        <AppLayout>
        <div className="container mx-auto py-8">
            <Head title="Kelola Item" />
            
            <div className="flex justify-between items-center mb-6">
                <div className="flex gap-4 items-center">
                    <Link href="/dashboard" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Dasbor
                    </Link>
                    <h1 className="text-2xl font-bold">Kelola Item</h1>
                </div>
                
                <div className="flex gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                Bulk Update Stok
                            </Button>
                        </DialogTrigger>
                        
                        <DialogContent className="sm:max-w-md">
                            <form onSubmit={handleBulkSubmit}>
                                <DialogHeader>
                                    <DialogTitle>Bulk Update Stok</DialogTitle>
                                    <DialogDescription>
                                        Upload file Excel untuk menambah stok secara massal
                                    </DialogDescription>
                                </DialogHeader>
                                
                                <div className="grid gap-4 py-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="excel_file">File Excel</Label>
                                        <Input
                                            id="excel_file"
                                            type="file"
                                            accept=".xlsx,.xls"
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setData('excel_file', e.target.files[0]);
                                                }
                                            }}
                                        />
                                        {errors.excel_file && (
                                            <p className="text-sm text-red-500">{errors.excel_file}</p>
                                        )}
                                        {progress && (
                                            <progress value={progress.percentage} max="100">
                                                {progress.percentage}%
                                            </progress>
                                        )}
                                        <p className="text-sm text-muted-foreground">
                                            Format file harus sesuai template. 
                                            <a 
                                                href={templateUrl}
                                                onClick={handleDownloadTemplate}
                                                className="text-primary ml-1 hover:underline cursor-pointer"
                                            >
                                                Unduh template disini
                                            </a>
                                        </p>
                                    </div>
                                </div>
                                
                                <DialogFooter>
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        onClick={() => setIsDialogOpen(false)}
                                        disabled={processing}
                                    >
                                        Batal
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        disabled={!data.excel_file || processing}
                                    >
                                        {processing ? (
                                            <>
                                                <svg 
                                                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                                                    xmlns="http://www.w3.org/2000/svg" 
                                                    fill="none" 
                                                    viewBox="0 0 24 24"
                                                >
                                                    <circle 
                                                        className="opacity-25" 
                                                        cx="12" 
                                                        cy="12" 
                                                        r="10" 
                                                        stroke="currentColor" 
                                                        strokeWidth="4"
                                                    ></circle>
                                                    <path 
                                                        className="opacity-75" 
                                                        fill="currentColor" 
                                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                    ></path>
                                                </svg>
                                                Memproses...
                                            </>
                                        ) : (
                                            'Update Stok'
                                        )}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    
                    <AlertDialog open={isResetAllDialogOpen} onOpenChange={setIsResetAllDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="flex items-center gap-2">
                                <RotateCcw className="w-4 h-4" />
                                Reset Semua Stok
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Reset Semua Stok?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Tindakan ini akan mengatur ulang SEMUA stok menjadi 0. 
                                    <span className="font-bold text-red-500"> Tidak dapat dibatalkan!</span>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Batal</AlertDialogCancel>
                                <AlertDialogAction 
                                    onClick={handleResetAll}
                                    className="bg-red-500 hover:bg-red-600"
                                >
                                    Lanjutkan Reset
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    
                    <Link href="/admin/gudang/items/create" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Item
                    </Link>
                </div>
            </div>

            {globalLowStockItems.length > 0 && (
                <div 
                    className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-md cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => setIsLowStockDialogOpen(true)}
                >
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <AlertCircle className="h-5 w-5 text-yellow-500" aria-hidden="true" />
                        </div>
                        <div className="ml-3">
                            <p className="text-sm text-yellow-700">
                                <span className="font-medium">Peringatan Stok Rendah!</span>{' '}
                                Terdapat {globalLowStockItems.length} item dengan stok ≤ 10. 
                                <span className="font-medium underline ml-1">Klik untuk melihat detail</span>
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <Dialog open={isLowStockDialogOpen} onOpenChange={setIsLowStockDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-yellow-700">
                            <AlertCircle className="h-5 w-5 text-yellow-500" />
                            Item dengan Stok Rendah (≤ 10)
                        </DialogTitle>
                        <DialogDescription>
                            Berikut adalah semua item dengan stok rendah di sistem:
                        </DialogDescription>
                    </DialogHeader>
                    
                    <div className="max-h-[60vh] overflow-y-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Item</TableHead>
                                    <TableHead>Jenjang</TableHead>
                                    <TableHead>Jenis Kelamin</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Stok</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {globalLowStockItems.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-4">
                                            Tidak ada item dengan stok rendah
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    globalLowStockItems.map((item) => (
                                        <TableRow key={item.id} className={item.qty <= 10 ? '' : ''}>
                                            <TableCell className='text-orange-400 flex items-center gap-1'>{capitalizeWords(item.nama_item)} <AlertCircle className="h-4 w-4 mr-1" /></TableCell>
                                            <TableCell>{item.jenjang}</TableCell>
                                            <TableCell>{item.jenis_kelamin}</TableCell>
                                            <TableCell>{item.size}</TableCell>
                                            <TableCell className="text-orange-400 font-medium">
                                                <div className="flex items-center">
                                                    
                                                    {item.qty}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                    
                    <DialogFooter>
                        <Button onClick={() => setIsLowStockDialogOpen(false)}>
                            Tutup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Card className="w-full">
                <div className="p-4">
                    <div className="flex gap-4 mb-6">
                        <Input
                            placeholder="Cari nama item..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Select value={jenjang} onValueChange={setJenjang}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jenjang..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua jenjang</SelectItem>
                                {jenjangOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={jenisKelamin} onValueChange={setJenisKelamin}>
                            <SelectTrigger>
                                <SelectValue placeholder="Pilih jenis kelamin..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua jenis kelamin</SelectItem>
                                {jenisKelaminOptions.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Item</TableHead>
                                <TableHead>Jenjang</TableHead>
                                <TableHead>Jenis Kelamin</TableHead>
                                <TableHead>Size</TableHead>
                                <TableHead>Stok</TableHead>
                                <TableHead className="w-40">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                        {items.data.map((item) => {
                            const qty = item.stock?.qty || 0;
                            const isLowStock = lowStockItemIds.has(item.id);
                            
                            return (
                                <TableRow key={item.id}>
                                    <TableCell className={isLowStock ? "text-orange-400 font-medium" : ""}>
                                        <div className='flex items-center gap-1'>
                                            {capitalizeWords(item.nama_item)}
                                            {isLowStock && <AlertCircle className="h-4 w-4" />}
                                        </div>
                                    </TableCell>
                                    <TableCell>{item.jenjang}</TableCell>
                                    <TableCell>{item.jenis_kelamin}</TableCell>
                                    <TableCell>{item.size}</TableCell>
                                    <TableCell className={isLowStock ? "text-orange-400 font-medium" : ""}>
                                        {qty}
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Link 
                                            href={`/admin/gudang/items/${item.id}/stock`} 
                                            className="text-primary border rounded px-2 py-1 hover:bg-primary/10 flex items-center"
                                        >
                                            <Edit className="w-4 h-4 mr-2" />
                                            Edit
                                        </Link>
                                        
                                        <AlertDialog 
                                            open={itemToReset === item.id} 
                                            onOpenChange={(open) => open ? setItemToReset(item.id) : setItemToReset(null)}
                                        >
                                            <AlertDialogTrigger className="text-red-500 hover:bg-red-500/10 flex items-center px-2 py-1 border rounded">
                                                <RotateCcw className="w-4 h-4 mr-2" />
                                                Reset
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Reset Stok Item?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Tindakan ini akan mengatur ulang stok 
                                                        <span className="font-bold"> {item.nama_item}</span> menjadi 0. 
                                                        <span className="font-bold text-red-500"> Tidak dapat dibatalkan!</span>
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={() => handleResetItem(item.id)}
                                                        className="bg-red-500 hover:bg-red-600"
                                                    >
                                                        Lanjutkan Reset
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>

                                        <AlertDialog 
                                            open={itemToDelete === item.id} 
                                            onOpenChange={(open) => open ? setItemToDelete(item.id) : setItemToDelete(null)}
                                        >
                                            <AlertDialogTrigger className="text-red-100 bg-red-900 hover:bg-red-900/90 flex items-center px-2 py-1 border rounded">
                                                <Trash2 className="w-4 h-4 mr-2" />
                                                Hapus
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Hapus Item Ini?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Tindakan ini akan menghapus permanen item <span className="font-bold">{capitalizeWords(item.nama_item)}</span> beserta stoknya. 
                                                        <span className="font-bold text-red-500 block mt-2">Tindakan ini tidak dapat dibatalkan!</span>
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                                    <AlertDialogAction 
                                                        onClick={() => handleDeleteItem(item.id)}
                                                        className="bg-red-500 hover:bg-red-600"
                                                    >
                                                        Lanjutkan Hapus
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                        </TableBody>
                    </Table>

                    <Pagination className="mt-6">
                        <PaginationContent>
                            <PaginationItem>
                            {items.links[0].url ? (
                                <div
                                onClick={() => router.get(items.links[0].url!, {}, {
                                    preserveState: true,
                                    preserveScroll: true,
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

                            {items.links.slice(1, -1).map((link, index) => (
                            <PaginationItem key={index}>
                                {link.url ? (
                                <div
                                    onClick={() => router.get(link.url!, {}, {
                                    preserveState: true,
                                    preserveScroll: true,
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
                            {items.links[items.links.length - 1].url ? (
                                <div
                                onClick={() => router.get(items.links[items.links.length - 1].url!, {}, {
                                    preserveState: true,
                                    preserveScroll: true,
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
            </Card>
        </div>
        </AppLayout>
    );
};

export default ItemsIndex;