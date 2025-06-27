import { Head, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowLeft, Home, Minus } from 'lucide-react';
import { Link } from '@inertiajs/react';
import { type PageProps } from '@inertiajs/core';
import { toast } from 'sonner';

interface Item {
    id: number;
    nama_item: string;
    jenjang: string;
    jenis_kelamin: string;
    size: string;
    stock: number;
}

interface SelectedItem {
    id: number;
    nama_item: string;
    jenjang: string;
    jenis_kelamin: string;
    size: string;
    stock: number;
    qty_requested: number;
}

interface OrderFormData {
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    items: SelectedItem[];
    [key: string]: any;
}

interface Props extends PageProps {
    items: Item[];
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
    nextOrderId?: number; // Add this to get the next order ID from backend
}

const CreateOrder = ({ items, jenjangOptions, jenisKelaminOptions, nextOrderId }: Props) => {
    const { data, setData, post, errors, processing } = useForm<OrderFormData>({
        nama_murid: '',
        jenjang: '',
        jenis_kelamin: '',
        items: [],
    });

    const [search, setSearch] = useState('');
    
    // Generate preview order number
    const previewOrderNumber = useMemo(() => {
        if (nextOrderId) {
            return `ORD-${nextOrderId.toString().padStart(5, '0')}`;
        }
        return 'ORD-XXXXX'; // Fallback if nextOrderId is not available
    }, [nextOrderId]);
    
    // Memoize filtered items to prevent unnecessary re-renders
    const filteredItemsMemo = useMemo(() => {
        if (!data.jenjang || !data.jenis_kelamin) {
            return [];
        }
        
        let filtered = [...items];
        
        if (data.jenjang) {
            // Updated filtering logic to include compound jenjang values
            filtered = filtered.filter(item => 
                item.jenjang === data.jenjang || 
                item.jenjang.includes(data.jenjang)
            );
        }
        
        if (data.jenis_kelamin) {
            filtered = filtered.filter(item => item.jenis_kelamin === data.jenis_kelamin);
        }
        
        if (search) {
            const searchLower = search.toLowerCase();
            filtered = filtered.filter(item => 
                item.nama_item.toLowerCase().includes(searchLower) ||
                item.size.toLowerCase().includes(searchLower)
            );
        }
        
        return filtered;
    }, [items, data.jenjang, data.jenis_kelamin, search]);
    
    const addItem = (item: Item) => {
        const existingItem = data.items.find(i => i.id === item.id);
        
        if (existingItem) {
            const updatedItems = data.items.map(i => 
                i.id === item.id 
                    ? { ...i, qty_requested: i.qty_requested + 1 }
                    : i
            );
            setData('items', updatedItems);
            toast.success("Item Ditambahkan", {
                description: `${item.nama_item} berhasil ditambahkan ke order`,
                duration: 2000,
            });
        } else {
            setData('items', [...data.items, { 
                id: item.id, 
                nama_item: item.nama_item,
                jenjang: item.jenjang,
                jenis_kelamin: item.jenis_kelamin,
                size: item.size,
                stock: item.stock,
                qty_requested: 1 
            }]);
            toast.success("Item Ditambahkan", {
                description: `${item.nama_item} berhasil ditambahkan ke order`,
                duration: 2000,
            });
        }
    };

    const updateQty = (index: number, qty: number) => {
        if (qty < 1) return;
        
        const updatedItems = [...data.items];
        updatedItems[index] = {
            ...updatedItems[index],
            qty_requested: qty
        };
        setData('items', updatedItems);
    };

    const incrementQty = (index: number) => {
        const currentQty = data.items[index].qty_requested;
        updateQty(index, currentQty + 1);
    };

    const decrementQty = (index: number) => {
        const currentQty = data.items[index].qty_requested;
        if (currentQty > 1) {
            updateQty(index, currentQty - 1);
        }
    };

    const removeItem = (index: number) => {
        const currentItems = [...data.items];
        const removedItem = currentItems[index];
        currentItems.splice(index, 1);
        setData('items', currentItems);
        
        toast.info("Item Dihapus", {
            description: `${removedItem.nama_item} dihapus dari order`,
            duration: 2000,
        });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
    
        if (data.items.length === 0) {
            toast.warning("Order Kosong", {
                description: "Silakan tambahkan setidaknya satu item ke order",
                duration: 3000,
            });
            return;
        }

        post(route('admin-ukur.orders.store'), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                // Only clear items, keep filters
                setData('items', []);
                setData('nama_murid', '');
                setSearch('');
                
                toast.success("Order Berhasil Dibuat", {
                    description: `Order untuk ${data.nama_murid} berhasil disimpan`,
                    duration: 3000,
                });
            },
            onError: (errors) => {
                if (errors.items) {
                    toast.error("Gagal Menyimpan Order", {
                        description: errors.items,
                        duration: 5000,
                    });
                }
                // Show other form validation errors
                Object.entries(errors).forEach(([field, error]) => {
                    if (field !== 'items') {
                        toast.error("Error Validasi", {
                            description: `${field}: ${error}`,
                            duration: 4000,
                        });
                    }
                });
            }
        });
    };

    return (
        <div className="container mx-auto py-8">
            <Head title="Buat Order Baru" />
            
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
                <h1 className="text-2xl font-bold">Buat Order Baru</h1>
            </div>

            <Card className="w-full p-6">
                <form onSubmit={submit}>
                    <div className="mb-6">
                        <h1 className='text-3xl font-bold mb-2'>
                            {previewOrderNumber}
                        </h1>
                        <p className="text-sm text-gray-500">
                            Nomor order akan dikonfirmasi setelah disimpan
                        </p>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                        <div>
                            <Label htmlFor="nama_murid">Nama Murid</Label>
                            <Input
                                id="nama_murid"
                                value={data.nama_murid}
                                onChange={(e) => setData('nama_murid', e.target.value)}
                                className="mt-1"
                                placeholder="Nama lengkap murid"
                            />
                            {errors.nama_murid && (
                                <p className="mt-1 text-sm text-red-500">{errors.nama_murid}</p>
                            )}
                        </div>
                        
                        <div>
                            <Label htmlFor="jenjang">Jenjang</Label>
                            <Select 
                                value={data.jenjang} 
                                onValueChange={(value) => setData('jenjang', value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Pilih jenjang" />
                                </SelectTrigger>
                                <SelectContent>
                                    {jenjangOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.jenjang && (
                                <p className="mt-1 text-sm text-red-500">{errors.jenjang}</p>
                            )}
                        </div>
                        
                        <div>
                            <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                            <Select 
                                value={data.jenis_kelamin} 
                                onValueChange={(value) => setData('jenis_kelamin', value)}
                            >
                                <SelectTrigger className="mt-1">
                                    <SelectValue placeholder="Pilih jenis kelamin" />
                                </SelectTrigger>
                                <SelectContent>
                                    {jenisKelaminOptions.map(option => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.jenis_kelamin && (
                                <p className="mt-1 text-sm text-red-500">{errors.jenis_kelamin}</p>
                            )}
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <h2 className="text-xl font-semibold mb-4">Tambah Item</h2>
                        
                        <div className="mb-4">
                            <Label>Cari Item</Label>
                            <Input
                                placeholder="Cari nama item atau size..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="mt-1"
                                disabled={!data.jenjang || !data.jenis_kelamin}
                            />
                        </div>
                        
                        <div className="mt-4 max-h-60 overflow-y-auto border rounded">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nama Item</TableHead>
                                        <TableHead>Jenjang</TableHead>
                                        <TableHead>Jenis Kelamin</TableHead>
                                        <TableHead>Size</TableHead>
                                        <TableHead>Stok Tersedia</TableHead>
                                        <TableHead className="w-24">Aksi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!data.jenjang || !data.jenis_kelamin ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                Silakan pilih Jenjang dan Jenis Kelamin terlebih dahulu
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredItemsMemo.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                                                Tidak ada item yang ditemukan
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredItemsMemo.map((item) => (
                                            <TableRow key={item.id}>
                                                <TableCell className="font-medium">{item.nama_item}</TableCell>
                                                <TableCell>{item.jenjang}</TableCell>
                                                <TableCell>{item.jenis_kelamin}</TableCell>
                                                <TableCell>{item.size}</TableCell>
                                                <TableCell>
                                                    {item.stock}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => addItem(item)}
                                                        className='bg-green-600 hover:bg-green-700 text-white'
                                                    >
                                                        <Plus className="w-4 h-4 mr-1" />
                                                        Tambah
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                    
                    <div className="mb-8">
                        <h2 className="text-xl font-semibold mb-4">Item Dipilih</h2>
                        
                        {data.items.length === 0 ? (
                            <div className="border rounded py-12 text-center text-gray-500">
                                Belum ada item yang dipilih
                            </div>
                        ) : (
                            <div className="border rounded">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Nama Item</TableHead>
                                            <TableHead>Jenjang</TableHead>
                                            <TableHead>Jenis Kelamin</TableHead>
                                            <TableHead>Size</TableHead>
                                            <TableHead className="w-40">Jumlah</TableHead>
                                            <TableHead>Stok</TableHead>
                                            <TableHead className="w-16">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.items.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{item.nama_item}</TableCell>
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
                                                            value={item.qty_requested.toString()}
                                                            onChange={(e) => {
                                                                const inputValue = e.target.value;
                                                                // Only allow numeric characters
                                                                if (/^\d*$/.test(inputValue)) {
                                                                    const parsedValue = parseInt(inputValue) || 0;
                                                                    if (parsedValue >= 1) {
                                                                        updateQty(index, parsedValue);
                                                                    }
                                                                }
                                                            }}
                                                            onBlur={(e) => {
                                                                // Ensure minimum value of 1 when input loses focus
                                                                const inputValue = e.target.value;
                                                                const parsedValue = parseInt(inputValue) || 1;
                                                                if (parsedValue < 1) {
                                                                    updateQty(index, 1);
                                                                }
                                                            }}
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
                                                <TableCell>
                                                    {item.stock}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        onClick={() => removeItem(index)}
                                                        variant="destructive"
                                                        className="hover:bg-red-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-1" />
                                                        Hapus
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex justify-between">
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={() => {
                                setData('items', []);
                                toast.info("Semua Item Dihapus", {
                                    description: "Semua item telah dihapus dari order",
                                    duration: 2000,
                                });
                            }}
                            disabled={data.items.length === 0}
                        >
                            Hapus Semua Item
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={data.items.length === 0 || processing}
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            {processing ? 'Membuat Order...' : 'Buat Order'}
                        </Button>
                    </div>
                </form>
            </Card>
        </div>
    );
};

export default CreateOrder;