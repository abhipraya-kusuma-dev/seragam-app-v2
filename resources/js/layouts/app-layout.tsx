import { type ReactNode } from 'react';
import { usePage } from '@inertiajs/react';
import { useEcho } from '@laravel/echo-react';
import { Toaster, toast } from 'sonner';

// [PERBAIKAN] Mengimpor tipe yang benar dari file terpusat Anda.
import { type PageProps, type Order, type BreadcrumbItem } from '@/types';

// Komponen "tak terlihat" yang hanya bertugas mendengarkan event.
function RealtimeNotificationHandler() {
    const { auth } = usePage<PageProps>().props;
    
    useEcho(
        'gudang',
        'NewOrderCreated',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_gudang') {
                toast.info('Ada Order yang baru dibuar', {
                    description: `Order #${event.order.order_number}`,
                });           
            }
        }
    );
    useEcho(
        'qc',
        'OrderReaded',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_qc') {
                toast.info('Ada Order yang diedit masuk', {
                    description: `Order #${event.order.order_number}, ${event.order.status === 'in-progress'? 'Perlu Diperiksa' : 'Pending'}`,
                });
            }
        }
    );
    useEcho(
        'qc',
        'OrderReturnedBack',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_qc') {
                toast.warning('Ada Order yang dikembalikan dari Gudang', {
                    description: `Order #${event.order.order_number}`,
                });
            }
        }
    );
    useEcho(
        'ukur',
        'OrderCancelled',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_ukur') {
                toast.warning('Ada order yang dibatalkan', {
                    description: `Order #${event.order.order_number} dibatalkan`,
                });
            }
        }
    );
    useEcho(
        'qc',
        'OrderCancelledQc',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_qc') {
                toast.warning('Ada order yang dibatalkan', {
                    description: `Order #${event.order.order_number} dibatalkan`,
                });
            }
        }
    );
    useEcho(
        'qc',
        'OrderCancelledGudang',
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_gudang') {
                toast.warning('Ada order yang dibatalkan', {
                    description: `Order #${event.order.order_number} dibatalkan`,
                });
            }
        }
    );
    useEcho(
        'ukur', 
        'OrderReturned', 
        (event: { order: Order}) => {
            if(auth.user?.role === 'admin_ukur') {
                toast.warning('Ada order yang dikembalikan', {
                    description: `Order #${event.order.order_number} dikembalikan`,
                });
            }
    })
    useEcho(
        'gudang', 
        'OrderEdited', 
        (event: {order: Order}) => {
            if(auth.user?.role === 'admin_gudang') {
                toast.warning('Ada order yang diedit', {
                    description: `Order #${event.order.order_number} diedit`,
                })
            }
        });

    return null; // Komponen ini tidak me-render elemen visual.
}

interface AppLayoutProps {
    children: ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

// [PERUBAHAN] Layout ini sekarang menjadi komponen fungsional yang berisi
// handler notifikasi dan toaster, serta konten halaman Anda.
export default function AppLayout({ children }: AppLayoutProps) {
    return (
        <div>
            {/* Memanggil handler notifikasi agar selalu aktif */}
            <RealtimeNotificationHandler />
            
            {/* Menyediakan komponen Toaster untuk menampilkan notifikasi */}
            <Toaster position="top-center" richColors closeButton />

            {/* Konten halaman Anda akan ditampilkan di sini tanpa ada UI tambahan */}
            <main>
                {children}
            </main>
        </div>
    );
}
