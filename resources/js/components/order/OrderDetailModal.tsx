// resources/js/components/order/OrderDetailModal.tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Order } from '@/types/order';
import { Download } from 'lucide-react';
import { useState } from 'react';
import { router } from '@inertiajs/react';
import jsPDF from 'jspdf';
import { toast } from 'sonner'; // Import Sonner

interface OrderDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onNotificationUpdate?: (orderId: number) => void;
}

export default function OrderDetailModal({ isOpen, onClose, order, onNotificationUpdate }: OrderDetailModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!order) return null;

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const downloadOrderPDF = async (order: Order) => {
    setIsDownloading(true);
    
    try {
      // Show downloading toast
      toast.info('Sedang membuat PDF...', {
        description: 'Mohon tunggu sebentar'
      });
      
      const formatDateForReceipt = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('id-ID', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      };
  
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, 210]
      });
  
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
  
      let currentY = 10;
      const lineHeight = 3;
      const pageWidth = 58;
  
      const addCenteredText = (text: string, y: number, fontSize = 8, style = 'normal') => {
        doc.setFontSize(fontSize);
        doc.setFont('courier', style);
        const textWidth = doc.getTextWidth(text);
        const x = (pageWidth - textWidth) / 2;
        doc.text(text, x, y);
        return y + lineHeight;
      };
  
      const addLeftRightText = (leftText: string, rightText: string, y: number) => {
        doc.setFontSize(7);
        doc.setFont('courier', 'normal');
        doc.text(leftText, 2, y);
        
        const rightTextWidth = doc.getTextWidth(rightText);
        doc.text(rightText, pageWidth - rightTextWidth - 2, y);
        return y + lineHeight;
      };
  
      currentY = addCenteredText('STRUK ORDER SERAGAM', currentY, 9, 'bold');
      currentY += 2;
  
      doc.setLineWidth(0.1);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(2, currentY, pageWidth - 2, currentY);
      currentY += 3;
  
      currentY = addLeftRightText('No. Order:', order.order_number, currentY);
      currentY = addLeftRightText('Tanggal:', formatDateForReceipt(order.created_at), currentY);
      currentY += 2;
  
      doc.line(2, currentY, pageWidth - 2, currentY);
      currentY += 3;
  
      currentY = addLeftRightText('Nama:', order.nama_murid, currentY);
      currentY = addLeftRightText('Jenjang:', order.jenjang, currentY);
      currentY = addLeftRightText('Jenis Kelamin:', order.jenis_kelamin, currentY);
      currentY += 2;
  
      doc.line(2, currentY, pageWidth - 2, currentY);
      currentY += 3;
  
      if (order.order_items && order.order_items.length > 0) {
        order.order_items.forEach(item => {
          const itemText = `${item.item.nama_item} [${item.item.size}]: ${item.qty_requested}`;
          const maxWidth = pageWidth - 4;
          const textWidth = doc.getTextWidth(itemText);
          
          if (textWidth > maxWidth) {
            const words = itemText.split(' ');
            let line = '';
            
            words.forEach(word => {
              const testLine = line + (line ? ' ' : '') + word;
              const testWidth = doc.getTextWidth(testLine);
              
              if (testWidth > maxWidth && line) {
                doc.text(line, 2, currentY);
                currentY += lineHeight;
                line = word;
              } else {
                line = testLine;
              }
            });
            
            if (line) {
              doc.text(line, 2, currentY);
              currentY += lineHeight;
            }
          } else {
            doc.text(itemText, 2, currentY);
            currentY += lineHeight;
          }
          
          currentY += 1;
        });
      } else {
        currentY = addCenteredText('Tidak ada item', currentY, 7, 'italic');
      }
  
      currentY += 3;
      doc.line(2, currentY, pageWidth - 2, currentY);
      currentY += 3;
  
      currentY = addCenteredText('Terima kasih', currentY, 7);
      currentY = addCenteredText(`Didownload: ${new Date().toLocaleString('id-ID')}`, currentY, 6);
      currentY += 5;
  
      currentY = addCenteredText('TTD', currentY, 7, 'bold');
      currentY += 15;
      currentY = addCenteredText('Staff QC', currentY, 7, 'bold');
      doc.setLineDashPattern([], 0);
      doc.line(15, currentY - 2, 43, currentY - 2);
  
      doc.save(`${order.order_number}.pdf`);
  
      // Update notification status
      await updateNotificationStatus(order.id);
      
      // Show success toast
      toast.success('PDF berhasil diunduh', {
        description: `Struk order ${order.order_number} telah disimpan`
      });
      
      onClose();
  
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Gagal mengunduh PDF', {
        description: 'Silakan coba lagi'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const updateNotificationStatus = async (orderId: number) => {
    try {
      router.patch(`orders/${orderId}/notification-status`, {
        notif_status: true
      }, {
        preserveScroll: true,
        preserveState: true,
        only: [], 
        onSuccess: () => {
          if (onNotificationUpdate) {
            onNotificationUpdate(orderId);
          }
        },
        onError: (errors) => {
          console.error('Error updating notification status:', errors);
        }
      });
    } catch (error) {
      console.error('Error updating notification status:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[75vw] !max-w-[75vw] !h-[50vh] !max-h-[95vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Detail Order</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Informasi Order</h3>
              <p><span className="font-medium">No. Order:</span> {order.order_number}</p>
              <p><span className="font-medium">Tanggal:</span> {formatDate(order.created_at)}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-orange-100 text-orange-800'
                }`}>
                  {order.status === 'completed' ? 'Selesai' :
                   order.status === 'cancelled' ? 'Dibatalkan' : 
                   order.status === 'pending' ? 'Menunggu' : 'Diproses'}
                </span>
              </p>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Informasi Murid</h3>
              <p><span className="font-medium">Nama:</span> {order.nama_murid}</p>
              <p><span className="font-medium">Jenjang:</span> {order.jenjang}</p>
              <p><span className="font-medium">Jenis Kelamin:</span> {order.jenis_kelamin}</p>
            </div>

            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Status Notifikasi</h3>
              <p>
                <span className="font-medium">Dilihat:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  order.notif_status ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {order.notif_status ? 'Sudah dilihat' : 'Belum dilihat'}
                </span>
              </p>
              <p className="mt-2">
                <span className="font-medium">Dikembalikan:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  order.return_status ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {order.return_status ? 'Dikembalikan' : 'Tidak dikembalikan'}
                </span>
              </p>
            </div>
          </div>

          <div className="border rounded">
            <h3 className="font-semibold p-4 border-b">Item Order</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Item</TableHead>
                    <TableHead>Jenjang</TableHead>
                    <TableHead>Jenis Kelamin</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-left">Jumlah Diminta</TableHead>
                    <TableHead className="text-left">Jumlah Diberikan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {order.order_items && order.order_items.length > 0 ? (
                    order.order_items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="min-w-[200px]">{capitalizeWords(item.item.nama_item)}</TableCell>
                        <TableCell>{item.item.jenjang}</TableCell>
                        <TableCell>{item.item.jenis_kelamin}</TableCell>
                        <TableCell>{item.item.size}</TableCell>
                        <TableCell className="text-left">{item.qty_requested}</TableCell>
                        <TableCell className="text-left">{item.qty_provided}</TableCell>
                        <TableCell className="min-w-[120px]">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            item.status === 'completed' ? 'bg-green-100 text-green-800' :
                            item.status === 'uncompleted' ? 'bg-indigo-100 text-indigo-800' :
                            item.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                            item.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {item.status === 'completed' ? 'Selesai' :
                             item.status === 'uncompleted' ? 'Belum Lengkap' : 'Sedang Diproses'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-4">
                        Tidak ada item dalam order ini
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
            <Button 
              variant="default" 
              onClick={() => {
                downloadOrderPDF(order);
              }}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mengunduh...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2"/>
                  Unduh PDF
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}