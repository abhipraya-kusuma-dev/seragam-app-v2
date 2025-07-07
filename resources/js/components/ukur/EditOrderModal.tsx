import React, { useState, useEffect } from 'react';
import { useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, Minus, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useEcho } from '@laravel/echo-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Item {
    id: number;
    nama_item: string;
    jenjang: string;
    jenis_kelamin: string;
    size: string;
    stock: number;
}

interface SelectedItem extends Item {
    status: string;
    qty_requested: number;
    qty_provided: number;
}

// Define form data as a type with index signature
type OrderFormData = {
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    items: SelectedItem[];
    [key: string]: any; // Add index signature
};

interface EditOrderResponse {
    items: Item[];
    orderItems: {
        id: number;
        nama_item: string;
        jenjang: string;
        jenis_kelamin: string;
        size: string;
        stock: number;
        status: string;
        qty_requested: number;
        qty_provided: number;
    }[];
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    order: {
        id: number;
        order_number: string;
        nama_murid: string;
        jenjang: string;
        jenis_kelamin: string;
        status: string;
    };
    onSuccess: () => void;
}

const capitalizeWords = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function EditOrderModal({ 
    isOpen, 
    onClose, 
    order,
    onSuccess
}: Props) {
    const [items, setItems] = useState<Item[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { data, setData, patch, processing } = useForm<OrderFormData>({
        nama_murid: order.nama_murid,
        jenjang: order.jenjang,
        jenis_kelamin: order.jenis_kelamin,
        items: [],
    });
    const [search, setSearch] = useState('');
    const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

    // Fetch order items when modal opens
    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            fetch(route('admin-ukur.orders.edit-data', { order: order.id }))
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Gagal memuat data order');
                    }
                    return response.json();
                })
                .then((resData: EditOrderResponse) => {
                    setItems(resData.items);
                    
                    // Convert to selected items format
                    const selectedItems = resData.orderItems.map(item => ({
                        id: item.id,
                        nama_item: item.nama_item,
                        jenjang: item.jenjang,
                        jenis_kelamin: item.jenis_kelamin,
                        size: item.size,
                        stock: item.stock,
                        status: item.status,
                        qty_requested: item.qty_requested,
                        qty_provided: item.qty_provided
                    }));
                    
                    setData('items', selectedItems);
                })
                .catch((error: Error) => {
                    toast.error('Gagal memuat data', {
                        description: error.message || 'Terjadi kesalahan saat memuat data order'
                    });
                })
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    // Listen for stock updates
    useEcho(
        'ukur',
        'StockUpdated',
        (event: { item_id: number; new_stock: number }) => {
            setItems(prevItems => 
                prevItems.map(item => 
                    item.id === event.item_id ? { ...item, stock: event.new_stock } : item
                )
            );
            
            setData(prevData => ({
                ...prevData,
                items: prevData.items.map(item => 
                    item.id === event.item_id ? { ...item, stock: event.new_stock } : item
                ),
            }));
        }
    );

    useEcho(
        'ukur',
        'StockUpdated',
        (event: { item_id: number; new_stock: number }) => {
            // Updates the main list of all available items
            setItems(prevItems => 
                prevItems.map(item => 
                    item.id === event.item_id ? { ...item, stock: event.new_stock } : item
                )
            );
            
            // Updates the stock for items already selected in the current order
            setData(prevData => ({
                ...prevData,
                items: prevData.items.map(item => 
                    item.id === event.item_id ? { ...item, stock: event.new_stock } : item
                ),
            }));
        }
    );

    const filteredItems = items.filter(item => {
        if (!data.jenjang || !data.jenis_kelamin) return false;
        
        // Filter by jenjang
        if (data.jenjang) {
            if (!item.jenjang.includes(data.jenjang)) {
                if (data.jenjang.startsWith('SDS') && !item.jenjang.includes('SD')) return false;
                if (data.jenjang.startsWith('SDIT') && !item.jenjang.includes('SD')) return false;
            }
        }
        
        // Filter by gender
        if (data.jenis_kelamin && item.jenis_kelamin !== 'UNI' && item.jenis_kelamin !== data.jenis_kelamin) {
            return false;
        }
        
        // Filter by search
        if (search) {
            const searchLower = search.toLowerCase();
            if (!item.nama_item.toLowerCase().includes(searchLower) && 
                !item.size.toLowerCase().includes(searchLower)) {
                return false;
            }
        }
        
        return true;
    });
    
    const addItem = (item: Item) => {
        const existingItem = data.items.find(i => i.id === item.id);
        
        if (existingItem) {
            const updatedItems = data.items.map(i => 
                i.id === item.id ? { ...i, qty_requested: i.qty_requested + 1 } : i
            );
            setData('items', updatedItems);
        } else {
            setData('items', [...data.items, { ...item, qty_requested: 1, qty_provided: 0, status: 'in-progress'}]);
        }
        
        toast.success("Item Ditambahkan", { 
            description: `${capitalizeWords(item.nama_item)} berhasil ditambahkan.` 
        });
    };

    const updateQty = (index: number, qty: number) => {
        if (qty < 1) return;
        const updatedItems = [...data.items];
        updatedItems[index].qty_requested = qty;
        setData('items', updatedItems);
    };

    const incrementQty = (index: number) => updateQty(index, data.items[index].qty_requested + 1);

    const decrementQty = (index: number) => {
        if (data.items[index].qty_requested > 1) {
            updateQty(index, data.items[index].qty_requested - 1);
        }
    };

    const removeItem = (index: number) => {
        const removedItem = data.items[index];
        setData('items', data.items.filter((_, i) => i !== index));
        toast.info("Item Dihapus", { 
            description: `${capitalizeWords(removedItem.nama_item)} dihapus dari order.` 
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.items.length === 0) {
            toast.warning("Order Kosong", { 
                description: "Silakan tambahkan setidaknya satu item." 
            });
            return;
        }
        setIsConfirmDialogOpen(true);
    };

    const handleConfirmSubmit = () => {
        patch(route('admin-ukur.orders.update', { order: order.id }), {
            onSuccess: () => {
                onSuccess();
                onClose();
                toast.success("Order Berhasil Diperbarui");
            },
            onError: () => {
                toast.error("Gagal memperbarui order", {
                    description: "Terjadi kesalahan saat menyimpan perubahan"
                });
            },
            onFinish: () => {
                setIsConfirmDialogOpen(false);
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="!w-[85vw] !max-w-[85vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex justify-between items-center">
                        <span>Edit Order: {order.order_number}</span>
                    </DialogTitle>
                    <DialogDescription>
                        Edit item untuk order ini
                    </DialogDescription>
                </DialogHeader>

                {isLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                ) : (
                    <Card className="w-full p-6">
                        <form onSubmit={submit} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <Label htmlFor="nama_murid">Nama Murid</Label>
                                    <Input 
                                        id="nama_murid" 
                                        value={data.nama_murid} 
                                        onChange={e => setData('nama_murid', e.target.value.toUpperCase())} 
                                        className="mt-1" 
                                        placeholder="Nama lengkap murid" 
                                        disabled={true}
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="jenjang">Jenjang</Label>
                                    <Select
                                        value={data.jenjang}
                                        onValueChange={value => setData('jenjang', value)}
                                        disabled={true}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Pilih jenjang..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['SDIT', 'SDS', 'SMP', 'SMA', 'SMK'].map(option => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                                    <Select
                                        value={data.jenis_kelamin}
                                        onValueChange={value => setData('jenis_kelamin', value)}
                                        disabled={true}
                                    >
                                        <SelectTrigger className="mt-1">
                                            <SelectValue placeholder="Pilih jenis kelamin..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['Pria', 'Wanita'].map(option => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Tambah Item</h2>
                                <div>
                                    <Label>Cari Item</Label>
                                    <Input 
                                        placeholder="Cari nama item atau ukuran..." 
                                        value={search} 
                                        onChange={e => setSearch(e.target.value)} 
                                        className="mt-1" 
                                    />
                                </div>
                                <div className="mt-4 max-h-60 overflow-y-auto border rounded-md">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Nama Item</TableHead>
                                                <TableHead>Jenjang</TableHead>
                                                <TableHead>Jenis Kelamin</TableHead>
                                                <TableHead>Ukuran</TableHead>
                                                <TableHead>Stok</TableHead>
                                                <TableHead>Aksi</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredItems.length === 0 ? (
                                                <TableRow>
                                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                        {!data.jenjang || !data.jenis_kelamin 
                                                            ? "Silakan pilih Jenjang dan Jenis Kelamin." 
                                                            : "Tidak ada item yang ditemukan."}
                                                    </TableCell>
                                                </TableRow>
                                            ) : (
                                                filteredItems.map((item) => (
                                                    <TableRow key={item.id}>
                                                        <TableCell>{capitalizeWords(item.nama_item)}</TableCell>
                                                        <TableCell>{item.jenjang}</TableCell>
                                                        <TableCell>{item.jenis_kelamin}</TableCell>
                                                        <TableCell>{item.size}</TableCell>
                                                        <TableCell>{item.stock}</TableCell>
                                                        <TableCell>
                                                            <Button 
                                                                type="button" 
                                                                size="sm" 
                                                                onClick={() => addItem(item)} 
                                                                className='bg-green-600 hover:bg-green-700 text-white'
                                                            >
                                                                <Plus className="w-4 h-4 mr-1" /> Tambah
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Item Dipilih</h2>
                                {data.items.length === 0 ? (
                                    <div className="border rounded py-12 text-center text-muted-foreground">
                                        Belum ada item yang dipilih.
                                    </div>
                                ) : (
                                    <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>No.</TableHead>
                                                    <TableHead>Nama Item</TableHead>
                                                    <TableHead>Jenjang</TableHead>
                                                    <TableHead>Jenis Kelamin</TableHead>
                                                    <TableHead>Ukuran</TableHead>
                                                    <TableHead>Jumlah</TableHead>
                                                    <TableHead>Stok</TableHead>
                                                    <TableHead>Aksi</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {data.items.map((item, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{index + 1}</TableCell>
                                                        <TableCell>{capitalizeWords(item.nama_item)}</TableCell>
                                                        <TableCell>{item.jenjang}</TableCell>
                                                        <TableCell>{item.jenis_kelamin}</TableCell>
                                                        <TableCell>{item.size}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center">
                                                                <Button 
                                                                    type="button" 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="rounded-r-none h-10 px-3" 
                                                                    onClick={() => decrementQty(index)} 
                                                                    disabled={item.qty_requested <= 1}
                                                                >
                                                                    <Minus className="w-4 h-4" />
                                                                </Button>
                                                                <Input 
                                                                    type="text" 
                                                                    value={item.qty_requested} 
                                                                    onChange={e => updateQty(index, parseInt(e.target.value) || 1)} 
                                                                    className="rounded-none w-16 text-center h-10" 
                                                                />
                                                                <Button 
                                                                    type="button" 
                                                                    size="sm" 
                                                                    variant="outline" 
                                                                    className="rounded-l-none h-10 px-3" 
                                                                    onClick={() => incrementQty(index)}
                                                                >
                                                                    <Plus className="w-4 h-4" />
                                                                </Button>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>{item.stock}</TableCell>
                                                        <TableCell>
                                                            <Button 
                                                                type="button" 
                                                                size="sm" 
                                                                onClick={() => removeItem(index)} 
                                                                variant="destructive" 
                                                                className="hover:bg-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-1" /> Hapus
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </div>
                            
                            <div className="flex justify-between pt-4">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    onClick={() => setData('items', [])} 
                                    disabled={data.items.length === 0}
                                >
                                    Hapus Semua Item
                                </Button>
                                <Button 
                                    type="submit" 
                                    disabled={data.items.length === 0 || processing}
                                >
                                    {processing ? 'Menyimpan Perubahan...' : 'Simpan Perubahan'}
                                </Button>
                            </div>
                        </form>
                    </Card>
                )}

                <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Konfirmasi Perubahan Order</AlertDialogTitle>
                            <AlertDialogDescription>
                                Apakah perubahan order sudah sesuai?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={processing}>Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={handleConfirmSubmit} disabled={processing}>
                                {processing ? 'Memproses...' : 'Ya, Simpan Perubahan'}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </DialogContent>
        </Dialog>
    );
}