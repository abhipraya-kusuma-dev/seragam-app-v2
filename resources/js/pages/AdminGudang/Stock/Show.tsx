import { Head, useForm } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from 'sonner';
import { useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';

interface Props {
    item: {
        id: number;
        nama_item: string;
        jenjang: string;
        jenis_kelamin: string;
        size: string;
        stock?: {
            qty: number;
        };
    };
}

const StockShow = ({ item }: Props) => {
    const [isLoading, setIsLoading] = useState(false);
    const [localQty, setLocalQty] = useState(item.stock?.qty || 0);
    const { setData, put } = useForm({
        item_id: item.id,
        qty: item.stock?.qty || 0,
    });
    const inputRef = useRef<HTMLInputElement>(null);

    // Function to capitalize first letter of each word
    const toTitleCase = (str: string) => {
        return str.replace(/\w\S*/g, (txt) => {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        
        try {
            // Update form data with current local quantity
            setData('qty', localQty);
            await put(`/admin/gudang/items/${item.id}/stock`);
            toast.success( 'Berhasil', {
                description: 'Stok berhasil diperbarui',
            });
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            toast.error('Gagal', {
                description: 'Gagal memperbarui stok',
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AppLayout>
            <div className="container mx-auto py-8">
                <Head title={`Stok - ${item.nama_item}`} />
                
                <div className="flex justify-between items-center mb-6">
                    <div className="flex gap-4">
                        <Link href="/admin/gudang/items" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Kembali
                        </Link>
                        <h1 className="text-2xl font-bold">
                            Edit Stok - {toTitleCase(item.nama_item)}
                        </h1>
                    </div>
                </div>

                <Card className="w-full">
                    <div className="p-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
                                    <label className="block text-sm font-medium mb-2">Jumlah Stok</label>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => {
                                                const newValue = Math.max(0, localQty - 1);
                                                setLocalQty(newValue);
                                            }}
                                            disabled={localQty === 0}
                                        >
                                            <Minus className="w-4 h-4" />
                                        </Button>
                                        <Input
                                            type="text"
                                            ref={inputRef}
                                            value={localQty}
                                            onChange={(e) => {
                                                const value = parseInt(e.target.value) || 0;
                                                setLocalQty(Math.max(0, value));
                                            }}
                                            className="w-24 text-center"
                                            placeholder="0"
                                        />
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            type="button"
                                            onClick={() => {
                                                const newValue = localQty + 1;
                                                setLocalQty(newValue);
                                            }}
                                        >
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="bg-primary hover:bg-primary/90"
                                >
                                    {isLoading ? 'Memperbarui...' : 'Simpan Perubahan'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </Card>
                <Toaster />
            </div>
        </AppLayout>
    );
}; 

export default StockShow;