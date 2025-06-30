import { useForm } from '@inertiajs/react';
import { Head } from '@inertiajs/react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link } from '@inertiajs/react';
import { ArrowLeft, Upload, Home } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; 
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import AppLayout from '@/layouts/app-layout';
import { toast } from 'sonner';

interface Props {
    jenjangOptions: string[];
    jenisKelaminOptions: string[];
}

export default function ItemsCreate({ jenjangOptions, jenisKelaminOptions }: Props) {
    const [activeTab, setActiveTab] = useState('single');
    const [file, setFile] = useState<File | null>(null);
    const [importError, setImportError] = useState<string | null>(null);

    const { data, setData, processing, post, reset } = useForm({
        nama_item: '',
        jenjang: '',
        jenis_kelamin: '',
        size: '',
        excel_file: null as File | null,
    });

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const toastId = toast.loading('Mengunggah file dan memproses stok...');

        if (activeTab === 'single') {
            post('/admin/gudang/items');
        } else {
            if (!file) return;
            
            setData('excel_file', file);
            
            post('/admin/gudang/items/import', {
                forceFormData: true,
                onSuccess: () => {
                    toast.success('File berhasil diimpor!', {id: toastId});
                    reset('excel_file');
                    setFile(null);
                    setImportError(null);
                },
                onError: (errors) => {
                    toast.error(errors.excel_file || 'Terjadi kesalahan saat mengimpor file.', {id: toastId});
                    setImportError(errors.excel_file || 'Terjadi kesalahan saat mengimpor file.');
                }
            });
        }
    };

    return (
        <AppLayout>
        <div className="container mx-auto py-8">
            <Head title="Tambah Item" />
            
            <div className="flex gap-3 items-center mb-6">
                <Link href="/dashboard" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                    <Home className="w-4 h-4 mr-2" />
                    Dasbor
                </Link>
                <Link href="/admin/gudang/items" className="btn btn-ghost flex items-center px-4 py-2 border rounded-sm hover:bg-muted/50 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Kelola Item
                </Link>
                <h1 className="text-2xl font-bold">Tambah Item</h1>
            </div>

            <Card className="w-full">
                <div className="p-6">
                    <Tabs defaultValue="single" value={activeTab} onValueChange={setActiveTab}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="single">Tambah Satu Item</TabsTrigger>
                            <TabsTrigger value="bulk">Import dari Excel</TabsTrigger>
                        </TabsList>
                        <TabsContent value="single">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="nama_item" className="block text-sm font-medium mb-1">
                                            Nama Item
                                        </label>
                                        <Input
                                            id="nama_item"
                                            type="text"
                                            value={data.nama_item}
                                            onChange={(e) => setData('nama_item', e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="size" className="block text-sm font-medium mb-1">
                                            Size
                                        </label>
                                        <Input
                                            id="size"
                                            type="text"
                                            value={data.size}
                                            onChange={(e) => setData('size', e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="jenjang" className="block text-sm font-medium mb-1">
                                            Jenjang
                                        </label>
                                        <Select
                                            defaultValue={data.jenjang}
                                            onValueChange={(value) => setData('jenjang', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih jenjang..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {jenjangOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div>
                                        <label htmlFor="jenis_kelamin" className="block text-sm font-medium mb-1">
                                            Jenis Kelamin
                                        </label>
                                        <Select
                                            defaultValue={data.jenis_kelamin}
                                            onValueChange={(value) => setData('jenis_kelamin', value)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Pilih jenis kelamin..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {jenisKelaminOptions.map((option) => (
                                                    <SelectItem key={option} value={option}>
                                                        {option}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <Button type="submit" disabled={processing}>
                                        {processing ? 'Menambahkan...' : 'Tambah Item'}
                                    </Button>
                                </div>
                            </form>
                        </TabsContent>
                        <TabsContent value="bulk">
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h2 className="text-lg font-semibold">Format File Excel</h2>
                                    <div className="bg-muted p-4 rounded-lg">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-2">nama_item</th>
                                                    <th className="text-left py-2">jenjang</th>
                                                    <th className="text-left py-2">jenis_kelamin</th>
                                                    <th className="text-left py-2">size</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr className="border-b">
                                                    <td className="py-2">Contoh Item</td>
                                                    <td className="py-2">SDIT</td>
                                                    <td className="py-2">Pria</td>
                                                    <td className="py-2">S</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <p className="text-sm text-muted-foreground pt-2">
                                    Template: {' '}
                                    <a
                                        href="/templates/template_item.xlsx"
                                        onClick={(e) => toast.success('Template berhasil diunduh!')}
                                        className="font-medium text-primary hover:underline"
                                        download
                                    >
                                        Unduh template Excel disini.
                                    </a>
                                </p>
                                <div className="space-y-4">
                                    <div className="flex gap-2 items-center">
                                        <Upload className="w-5 h-5"/>
                                        <Label htmlFor="excel_file">Pilih File Excel</Label>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="file"
                                            id="excel_file"
                                            accept=".xlsx,.xls"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                const uploadedFile = e.target.files?.[0] ?? null;
                                                setFile(uploadedFile);
                                                setData('excel_file', uploadedFile);
                                            }}
                                            className="file-input"
                                        />
                                        {file && (
                                            <span className="text-sm text-muted-foreground">
                                                {file.name}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {importError && (
                                    <Alert variant="destructive">
                                        <AlertTitle>Error</AlertTitle>
                                        <AlertDescription>
                                            {importError}
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <div className="flex justify-end">
                                    <Button
                                        type="submit"
                                        disabled={processing || !file}
                                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => handleSubmit(e as unknown as React.FormEvent<HTMLFormElement>)}
                                    >
                                        {processing ? 'Mengimpor...' : 'Import Item'}
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </Card>
        </div>
        </AppLayout>
    );
}
