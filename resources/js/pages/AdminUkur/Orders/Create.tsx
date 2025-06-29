import React, { useState, useMemo } from 'react';
import { Head, useForm, Link } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, ArrowLeft, Home, Minus } from 'lucide-react';
import { type PageProps } from '@inertiajs/core';
import { toast } from 'sonner';
import AppLayout from '@/layouts/app-layout';
import { useEcho } from '@laravel/echo-react';

// --- INTERFACES ---

interface Item {
    id: number;
    nama_item: string;
    jenjang: string;
    jenis_kelamin: string;
    size: string;
    stock: number;
}

interface SelectedItem extends Item {
    qty_requested: number;
}

interface OrderFormData {
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    items: SelectedItem[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
}

interface Props extends PageProps {
    items: Item[];
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
    nextOrderId?: number;
    // FIX: Typed `errors` as a Record of string keys to string values,
    // which matches Inertia's validation error structure.
    errors: Record<string, string>;
}

// --- HELPERS & COMPONENT ---

const capitalizeWords = (str: string): string => {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

export default function CreateOrder({ items, jenjangOptions, jenisKelaminOptions, nextOrderId, errors }: Props) {
    const { data, setData, post, processing } = useForm<OrderFormData>({
        nama_murid: '',
        jenjang: '',
        jenis_kelamin: '',
        items: [],
    });
    const [search, setSearch] = useState('');
    const [currentNextOrderId, setCurrentNextOrderId] = useState<number | undefined>(nextOrderId);

    useEcho(
        'ukur',
        'NewOrderNumber',
        (event: { nextOrderId: number }) => {
            toast.info('Nomor Order Baru', {
                description: `ORD-${(event.nextOrderId).toString().padStart(5, '0')}`,
            });
            setCurrentNextOrderId(event.nextOrderId);
        }
    );

    const previewOrderNumber = useMemo(() => {
        return currentNextOrderId ? `ORD-${currentNextOrderId.toString().padStart(5, '0')}` : 'ORD-XXXXX';
    }, [currentNextOrderId]);
    
    const filteredItemsMemo = useMemo(() => {
        if (!data.jenjang || !data.jenis_kelamin) return [];
        let filtered = [...items];
        if (data.jenjang) {
            filtered = filtered.filter(item => item.jenjang === data.jenjang || item.jenjang.includes(data.jenjang));
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
            const updatedItems = data.items.map(i => i.id === item.id ? { ...i, qty_requested: i.qty_requested + 1 } : i);
            setData('items', updatedItems);
        } else {
            setData('items', [...data.items, { ...item, qty_requested: 1 }]);
        }
        toast.success("Item Ditambahkan", { description: `${capitalizeWords(item.nama_item)} berhasil ditambahkan.` });
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
        toast.info("Item Dihapus", { description: `${capitalizeWords(removedItem.nama_item)} dihapus dari order.` });
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (data.items.length === 0) {
            toast.warning("Order Kosong", { description: "Silakan tambahkan setidaknya satu item." });
            return;
        }
        post(route('admin-ukur.orders.store'), {
            onSuccess: () => {
                setData({ ...data, nama_murid: '', items: [] });
                setSearch('');
            }
        });
    };

    return (
        <AppLayout>
            <Head title="Buat Order Baru" />
            <div className="container mx-auto py-8">
                <div className="flex items-center gap-3 mb-6">
                    <Link href={route('dashboard')} className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors"><Home className="w-4 h-4 mr-2" />Dasbor</Link>
                    <Link href={route('admin-ukur.orders.index')} className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors"><ArrowLeft className="w-4 h-4 mr-2" />Daftar Order</Link>
                    <h1 className="text-2xl font-bold">Buat Order Baru</h1>
                </div>
                <Card className="w-full p-6">
                    <form onSubmit={submit} className="space-y-8">
                        <div>
                            <h1 className='text-3xl font-bold mb-2'>{previewOrderNumber}</h1>
                            <p className="text-sm text-gray-500">Nomor order akan dikonfirmasi setelah disimpan.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <Label htmlFor="nama_murid">Nama Murid</Label>
                                <Input id="nama_murid" value={data.nama_murid} onChange={e => setData('nama_murid', e.target.value)} className="mt-1" placeholder="Nama lengkap murid" />
                                {errors.nama_murid && <p className="mt-1 text-sm text-red-500">{errors.nama_murid}</p>}
                            </div>
                            <div>
                                <Label htmlFor="jenjang">Jenjang</Label>
                                <Select value={data.jenjang} onValueChange={value => setData('jenjang', value)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih jenjang..." /></SelectTrigger>
                                    <SelectContent>{jenjangOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                                {errors.jenjang && <p className="mt-1 text-sm text-red-500">{errors.jenjang}</p>}
                            </div>
                            <div>
                                <Label htmlFor="jenis_kelamin">Jenis Kelamin</Label>
                                <Select value={data.jenis_kelamin} onValueChange={value => setData('jenis_kelamin', value)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Pilih jenis kelamin..." /></SelectTrigger>
                                    <SelectContent>{jenisKelaminOptions.map(option => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                                </Select>
                                {errors.jenis_kelamin && <p className="mt-1 text-sm text-red-500">{errors.jenis_kelamin}</p>}
                            </div>
                        </div>
                        <div className="space-y-4">
                            <h2 className="text-xl font-semibold">Tambah Item</h2>
                            <div>
                                <Label>Cari Item</Label>
                                <Input placeholder="Cari nama item atau ukuran..." value={search} onChange={e => setSearch(e.target.value)} className="mt-1" disabled={!data.jenjang || !data.jenis_kelamin} />
                            </div>
                            <div className="mt-4 max-h-60 overflow-y-auto border rounded-md">
                                <Table>
                                    <TableHeader><TableRow><TableHead>Nama Item</TableHead><TableHead>Jenjang</TableHead><TableHead>Jenis Kelamin</TableHead><TableHead>Ukuran</TableHead><TableHead>Stok</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
                                    <TableBody>
                                        {!data.jenjang || !data.jenis_kelamin ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Silakan pilih Jenjang dan Jenis Kelamin.</TableCell></TableRow>
                                        ) : filteredItemsMemo.length === 0 ? (
                                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada item yang ditemukan.</TableCell></TableRow>
                                        ) : (
                                            filteredItemsMemo.map((item: Item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>{capitalizeWords(item.nama_item)}</TableCell>
                                                    <TableCell>{item.jenjang}</TableCell>
                                                    <TableCell>{item.jenis_kelamin}</TableCell>
                                                    <TableCell>{item.size}</TableCell>
                                                    <TableCell>{item.stock}</TableCell>
                                                    <TableCell><Button type="button" size="sm" onClick={() => addItem(item)} className='bg-green-600 hover:bg-green-700 text-white'><Plus className="w-4 h-4 mr-1" /> Tambah</Button></TableCell>
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
                                <div className="border rounded py-12 text-center text-muted-foreground">Belum ada item yang dipilih.</div>
                            ) : (
                                <div className="border rounded-md">
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Nama Item</TableHead><TableHead>Jenjang</TableHead><TableHead>Jenis Kelamin</TableHead><TableHead>Ukuran</TableHead><TableHead>Jumlah</TableHead><TableHead>Stok</TableHead><TableHead>Aksi</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {data.items.map((item: SelectedItem, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{capitalizeWords(item.nama_item)}</TableCell>
                                                    <TableCell>{item.jenjang}</TableCell>
                                                    <TableCell>{item.jenis_kelamin}</TableCell>
                                                    <TableCell>{item.size}</TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center">
                                                            <Button type="button" size="sm" variant="outline" className="rounded-r-none h-10 px-3" onClick={() => decrementQty(index)} disabled={item.qty_requested <= 1}><Minus className="w-4 h-4" /></Button>
                                                            <Input type="text" value={item.qty_requested} onChange={e => updateQty(index, parseInt(e.target.value) || 1)} className="rounded-none w-16 text-center h-10" />
                                                            <Button type="button" size="sm" variant="outline" className="rounded-l-none h-10 px-3" onClick={() => incrementQty(index)}><Plus className="w-4 h-4" /></Button>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>{item.stock}</TableCell>
                                                    <TableCell><Button type="button" size="sm" onClick={() => removeItem(index)} variant="destructive" className="hover:bg-red-600"><Trash2 className="w-4 h-4 mr-1" /> Hapus</Button></TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-between pt-4">
                            <Button type="button" variant="outline" onClick={() => setData('items', [])} disabled={data.items.length === 0}>Hapus Semua Item</Button>
                            <Button type="submit" disabled={data.items.length === 0 || processing}>{processing ? 'Membuat Order...' : 'Buat Order'}</Button>
                        </div>
                    </form>
                </Card>
            </div>
        </AppLayout>
    );
};