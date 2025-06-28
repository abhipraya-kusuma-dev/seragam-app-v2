// resources/js/components/qc/QualityCheckModal.tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle, XCircle, RotateCcw, Plus, Minus } from 'lucide-react';
import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { Item } from '@radix-ui/react-dropdown-menu';

export interface Order {
    id: number;
    order_number: string;
    nama_murid: string;
    jenjang: string;
    jenis_kelamin: string;
    status: 'in-progress' | 'completed' | 'pending' | 'cancelled';
    notif_status: boolean;
    return_status: boolean;
    created_at: string;
    updated_at: string;
    order_items: OrderItem[];
  }
  
  export interface OrderItem {
    id: number;
    item_id: number;
    order_id: number; 
    order_number: string;
    status: 'in-progress' | 'completed' | 'pending' | 'uncompleted';
    qty_requested: number;
    qty_provided: number;
    created_at: string; 
    updated_at: string; 
    item: {
      id: number; 
      nama_item: string;
      jenjang: string;
      jenis_kelamin: string;
      size: string;
      stock?: {
        id: number;
        item_id: number;
        qty: number;
      };
    };
  }

interface QualityCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
}

export default function QualityCheckModal({ isOpen, onClose, order }: QualityCheckModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderStatus, setOrderStatus] = useState<string>('in-progress');
  const [baseQuantities, setBaseQuantities] = useState<Record<number, number>>({});

  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  // Initialize order items when order changes
  useEffect(() => {
    if (order) {
      setOrderItems([...order.order_items]);
      setOrderStatus(order.status);
      
      // Store original qty_provided for pending orders
      if (order.status === 'pending') {
        const base: Record<number, number> = {};
        order.order_items.forEach(item => {
          base[item.id] = item.qty_provided;
        });
        setBaseQuantities(base);
      }
    }
  }, [order]);

  if (!order) return null;

  // Format date
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

  // Check if any item is still in progress
  const hasInProgressItems = orderItems.some(
    item => item.status === 'in-progress'
  );

  // Get maximum allowed quantity for an item
  const getMaxAllowedQty = (item: OrderItem) => {
    const stockQty = item.item.stock?.qty ?? 0;
    
    // For completed/cancelled orders, return current qty (no changes allowed)
    if (order.status === 'completed' || order.status === 'cancelled') {
      return item.qty_provided;
    }
    
    // For pending orders
    if (order.status === 'pending') {
      const baseQty = baseQuantities[item.id] || 0;
      return Math.min(item.qty_requested, baseQty + stockQty);
    }
    
    // For in-progress orders
    return Math.min(item.qty_requested, stockQty);
  };

  // Update item quantity provided
  const updateItemQtyProvided = (itemId: number, qty: number) => {
    const updatedItems = orderItems.map(item => {
      if (item.id === itemId) {
        const maxAllowed = getMaxAllowedQty(item);
        
        // Ensure quantity doesn't exceed allowed limits
        let newQty = Math.min(Math.max(0, qty), maxAllowed);

        // Update status based on quantity
        let newStatus: typeof item.status = 'in-progress';
        if (newQty === item.qty_requested) {
          newStatus = 'completed';
        } else if (newQty > 0 && newQty < item.qty_requested) {
          newStatus = 'uncompleted';
        } else if (newQty === 0) {
          newStatus = 'pending';
        }
        
        return {
          ...item,
          qty_provided: newQty,
          status: newStatus
        };
      }
      return item;
    });
    
    setOrderItems(updatedItems);
    
    // Update overall order status
    updateOrderStatus(updatedItems);
  };

  // Check if decrement is allowed for an item
  const canDecrement = (item: OrderItem) => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return false;
    }
    
    // For pending orders: only allow decrement if above base value
    if (order.status === 'pending') {
      const baseQty = baseQuantities[item.id] || 0;
      return item.qty_provided > baseQty;
    }
    
    // For in-progress orders
    return item.qty_provided > 0;
  };

  // Check if increment is allowed for an item
  const canIncrement = (item: OrderItem) => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return false;
    }
    
    return item.qty_provided < getMaxAllowedQty(item);
  };

  // Check if "Kosong" button should be disabled
  const isKosongDisabled = (item: OrderItem) => {
    if (order.status === 'completed' || order.status === 'cancelled') {
      return true;
    }
    
    // Always disabled for pending orders
    if (order.status === 'pending') {
      return true;
    }
    
    return false;
  };

  // Get maximum quantity for "Maksimal" button
  const getMaximalQty = (item: OrderItem) => {
    return getMaxAllowedQty(item);
  };

  // Increment quantity by 1
  const incrementQty = (itemId: number) => {
    const item = orderItems.find(i => i.id === itemId);
    if (item && canIncrement(item)) {
      updateItemQtyProvided(itemId, item.qty_provided + 1);
    }
  };

  // Decrement quantity by 1
  const decrementQty = (itemId: number) => {
    const item = orderItems.find(i => i.id === itemId);
    if (item && canDecrement(item)) {
      updateItemQtyProvided(itemId, item.qty_provided - 1);
    }
  };

  // Handle direct input change
  const handleInputChange = (itemId: number, value: string) => {
    const item = orderItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Parse integer and validate
    const parsedValue = parseInt(value || '0');
    if (!isNaN(parsedValue)) {
      // For pending orders: don't allow values below base quantity
      if (order.status === 'pending') {
        const baseQty = baseQuantities[item.id] || 0;
        if (parsedValue < baseQty) {
          updateItemQtyProvided(itemId, baseQty);
          return;
        }
      }
      updateItemQtyProvided(itemId, parsedValue);
    } else if (value === '') {
      // For pending orders: revert to base if empty
      if (order.status === 'pending') {
        const baseQty = baseQuantities[item.id] || 0;
        updateItemQtyProvided(itemId, baseQty);
      } else {
        updateItemQtyProvided(itemId, 0);
      }
    }
  };

  // Update overall order status based on items
  const updateOrderStatus = (items: OrderItem[]) => {
    const allCompleted = items.every(item => item.status === 'completed');
    const hasPending = items.some(item => item.status === 'pending');
    const hasUncompleted = items.some(item => item.status === 'uncompleted');
    
    if (allCompleted) {
      setOrderStatus('completed');
    } else if (hasPending) {
      setOrderStatus('pending');
    } else if (hasUncompleted) {
      setOrderStatus('pending');
    } else {
      setOrderStatus('in-progress');
    }
  };

  // Handle return order
  const handleReturnOrder = async () => {
    setIsSubmitting(true);
    router.patch(`/admin/qc/orders/${order.id}/return`, {}, {
      onSuccess: () => {
        toast.success('Order berhasil dikembalikan ke Gudang', {
          description: `Order #${order.order_number} telah dikembalikan`
        });
        onClose();
      },
      onError: (error) => {
        console.error('Error returning order:', error);
        toast.error('Gagal mengembalikan order', {
          description: error.message || 'Terjadi kesalahan saat mengembalikan order'
        });
      },
      onFinish: () => {
        setIsSubmitting(false);
      }
    });
  };

  // Handle cancel order
  const handleCancelOrder = async () => {
    setIsSubmitting(true);
    router.patch(`/admin/qc/orders/${order.id}/cancel`, {}, {
      onSuccess: () => {
        toast.success('Order berhasil dibatalkan', {
          description: `Order #${order.order_number} telah dibatalkan`
        });
        onClose();
      },
      onError: (error) => {
        console.error('Error cancelling order:', error);
        toast.error('Gagal membatalkan order', {
          description: error.message || 'Terjadi kesalahan saat membatalkan order'
        });
      },
      onFinish: () => {
        setIsSubmitting(false);
      }
    });
  };

  // Handle complete quality check
  const handleCompleteQC = async () => {
    setIsSubmitting(true);
    
    const data = {
      items: orderItems.map(item => {
        // For pending orders, send both the absolute value and the delta
        if (order?.status === 'pending') {
          const baseQty = baseQuantities[item.id] || 0;
          return {
            id: item.id,
            qty_provided: item.qty_provided,  // Absolute value
            base_qty: baseQty                   // Base quantity
          };
        }
        // For non-pending orders, just send the absolute value
        return {
          id: item.id,
          qty_provided: item.qty_provided
        };
      })
    };
  
    router.patch(`/admin/qc/orders/${order.id}/complete-qc`, data, {
      onSuccess: () => {
        toast.success('Proses QC berhasil diselesaikan', {
          description: `Order #${order.order_number} telah diverifikasi`
        });
        onClose();
      },
      onError: (error) => {
        console.error('Error completing QC:', error);
        toast.error('Gagal menyelesaikan QC', {
          description: error.message || 'Terjadi kesalahan saat menyelesaikan QC'
        });
      },
      onFinish: () => {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[85vw] !max-w-[85vw] !max-h-[95vh] overflow-y-auto rounded-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Quality Check - {order.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded p-4">
              <h3 className="font-semibold mb-2">Informasi Order</h3>
              <p><span className="font-medium">No. Order:</span> {order.order_number}</p>
              <p><span className="font-medium">Tanggal:</span> {formatDate(order.created_at)}</p>
              <p><span className="font-medium">Status:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {order.status === 'completed' ? 'Selesai' :
                   order.status === 'cancelled' ? 'Dibatalkan' : 
                   order.status === 'pending' ? 'Menunggu Stok' : 'Diproses'}
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
              <h3 className="font-semibold mb-2">Status QC</h3>
              <p>
                <span className="font-medium">Dikembalikan:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  order.return_status ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                }`}>
                  {order.return_status ? 'Dikembalikan' : 'Tidak dikembalikan'}
                </span>
              </p>
              <p className="mt-2">
                <span className="font-medium">Status Order:</span> 
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  orderStatus === 'completed' ? 'bg-green-100 text-green-800' :
                  orderStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                  orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {orderStatus === 'completed' ? 'Selesai' :
                   orderStatus === 'cancelled' ? 'Dibatalkan' : 
                   orderStatus === 'pending' ? 'Menunggu Stok' : 'Diproses'}
                </span>
              </p>
            </div>
          </div>

          {/* Order Items */}
          <div className="border rounded">
            <h3 className="font-semibold p-4 border-b">Item Order</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Item</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead className="text-right">Diminta</TableHead>
                    <TableHead className="text-right">Stok Tersedia</TableHead>
                    <TableHead className="text-center">Diterima</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-left">Input QC</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orderItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="min-w-[200px]">{capitalizeWords(item.item.nama_item)}</TableCell>
                      <TableCell>{item.item.size}</TableCell>
                      <TableCell className="text-right">{item.qty_requested}</TableCell>
                      <TableCell className="text-right">{item.item.stock?.qty ?? 0}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => decrementQty(item.id)}
                            disabled={!canDecrement(item)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <input
                            type="text"
                            value={item.qty_provided}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            className="w-16 mx-1 px-2 py-1 border rounded text-center"
                            disabled={orderStatus === 'completed' || orderStatus === 'cancelled'}
                          />
                          
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => incrementQty(item.id)}
                            disabled={!canIncrement(item)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          item.status === 'completed' ? 'bg-green-100 text-green-800' :
                          item.status === 'uncompleted' ? 'bg-purple-100 text-purple-800' :
                          item.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {item.status === 'completed' ? 'Selesai' :
                           item.status === 'uncompleted' ? 'Belum Lengkap' : 
                           item.status === 'pending' ? 'Stok Kosong' : 'Perlu Diperiksa'}
                        </span>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex justify-start gap-1">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQtyProvided(item.id, getMaximalQty(item))}
                            disabled={orderStatus === 'completed' || orderStatus === 'cancelled'}
                          >
                            Maksimal
                          </Button>
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => updateItemQtyProvided(item.id, 0)}
                            disabled={isKosongDisabled(item)}
                          >
                            Kosong
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-between gap-4">
            <div className="flex gap-2">
              <Button 
                variant="destructive"
                onClick={handleReturnOrder}
                disabled={isSubmitting || order.status === 'completed' || order.status === 'cancelled'}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Memproses...' : 'Kembalikan Order'}
              </Button>
              <Button 
                variant="destructive"
                onClick={handleCancelOrder}
                disabled={isSubmitting || order.status === 'completed' || order.status === 'cancelled'}
              >
                <XCircle className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Memproses...' : 'Batalkan Order'}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Tutup
              </Button>
              <Button 
                variant="default"
                onClick={handleCompleteQC}
                disabled={
                  isSubmitting || 
                  order.status === 'completed' || 
                  order.status === 'cancelled' || 
                  hasInProgressItems
                }
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                {isSubmitting ? 'Menyimpan...' : 'Selesaikan QC'}
              </Button>
            </div>
          </div>
          
          {/* Warning message if in-progress items exist */}
          {hasInProgressItems && (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Perhatian:</strong> Masih ada item yang belum diperiksa. 
                    Harap tentukan kuantitas untuk semua item sebelum menyelesaikan QC.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}