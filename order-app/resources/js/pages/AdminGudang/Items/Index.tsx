import { Head, router } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Plus, Upload, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useForm } from '@inertiajs/react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { cn } from '@/lib/utils';

// Utility function to capitalize first letter of each word
const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
};

interface Props {
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
    filters: {
        search?: string;
        jenjang?: string;
        jenis_kelamin?: string;
    };
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
}

const ItemsIndex = ({ items, filters, jenjangOptions, jenisKelaminOptions }: Props) => {
    const [search, setSearch] = useState(filters.search || '');
    const [jenjang, setJenjang] = useState(filters.jenjang || 'all');
    const [jenisKelamin, setJenisKelamin] = useState(filters.jenis_kelamin || 'all');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isResetAllDialogOpen, setIsResetAllDialogOpen] = useState(false);
    const [itemToReset, setItemToReset] = useState<number | null>(null);
    
    const { data, setData, post, errors, reset, progress } = useForm({
        excel_file: null as File | null,
    });

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

    const handleBulkSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('admin-gudang.items.bulk-update-stock'), {
            onSuccess: () => {
                setIsDialogOpen(false);
                reset();
            },
        });
    };

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

    return (
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
                    {/* Bulk Update Button */}
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
                                            <a href="/templates/template_stok.xlsx" className="text-primary ml-1 hover:underline">
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
                                    >
                                        Batal
                                    </Button>
                                    <Button type="submit" disabled={!data.excel_file}>
                                        Update Stok
                                    </Button>
                                </DialogFooter>
                            </form>
                        </DialogContent>
                    </Dialog>
                    
                    {/* Reset All Stock Button */}
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
                            {items.data.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>{capitalizeWords(item.nama_item)}</TableCell>
                                    <TableCell>{item.jenjang}</TableCell>
                                    <TableCell>{item.jenis_kelamin}</TableCell>
                                    <TableCell>{item.size}</TableCell>
                                    <TableCell>
                                        {item.stock?.qty || 0}
                                    </TableCell>
                                    <TableCell className="flex gap-2">
                                        <Link 
                                            href={`/admin/gudang/items/${item.id}/stock`} 
                                            className="text-primary hover:underline"
                                        >
                                            Edit
                                        </Link>
                                        
                                        {/* Per-item reset button */}
                                        <AlertDialog 
                                            open={itemToReset === item.id} 
                                            onOpenChange={(open) => open ? setItemToReset(item.id) : setItemToReset(null)}
                                        >
                                            <AlertDialogTrigger className="text-red-500 hover:underline">
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
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination Component */}
                    <Pagination className="mt-6">
                        <PaginationContent>
                            {/* Previous Page Button */}
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

                            {/* Page Numbers */}
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

                            {/* Next Page Button */}
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
    );
};

export default ItemsIndex;