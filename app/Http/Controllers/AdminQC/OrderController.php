<?php

namespace App\Http\Controllers\AdminQC;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\Stock;;
use App\Events\OrderStatusUpdated;
use App\Events\OrderReturned;
use App\Events\OrderStatusUpdatedUkur;
use App\Events\OrderCancelled;
use App\Events\OrderCancelledGudang;
use App\Events\OrderCancelledQc;
use App\Events\QtyReducedGudang;
use App\Events\StockUpdated;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_qc') {
            abort(403, 'Unauthorized');
        }

        $orders = Order::where('notif_status', true)
            ->where('return_status', false)
            ->where('status', 'pending')
            ->with('orderItems.item.stock')
            ->orderBy('updated_at', 'asc')
            ->paginate(10);
                
        return inertia('AdminQC/Orders/Index', [
            'orders' => $orders,
            'filters' => request()->only(['search', 'jenjang', 'jenis_kelamin'])
        ]);
    }

    
    public function kembalikanOrder(Request $request, Order $order)
    {
        DB::transaction(function () use ($order) {
            // Restore stock for provided quantities
            foreach ($order->orderItems as $item) {
                if ($item->qty_provided > 0) {
                    Stock::where('item_id', $item->item_id)
                        ->increment('qty', $item->qty_provided);
                }
            }
            if($order->status === 'in-progress'){
                // Reset order items
                $order->orderItems()->update([
                    'qty_provided' => 0,
                    'status' => 'in-progress'
                ]);

                // Update order status
                $order->update([
                    'return_status' => true,
                    'status' => 'in-progress'
                ]);
            }

            $order->update([
                'return_status' => true
            ]);
            
            event(new OrderReturned($order));
        });

        return redirect()->back()->with('success', 'Order berhasil dikembalikan ke Gudang');
    }
    public function batalkanOrder(Request $request, Order $order)
    {
        DB::transaction(function () use ($order) {
            if($order->status === 'pending'){
                foreach ($order->orderItems as $item) {
                    Stock::where('item_id', $item->item_id)
                    ->increment('qty', $item->qty_requested);
                }
            }
            // Update order status and reset quantities
            $order->update(['status' => 'cancelled']);
            $order->orderItems()->update([
                'qty_provided' => 0,
                'status' => 'pending'
            ]);
        });

        event(new OrderCancelled($order));
        event(new OrderCancelledGudang($order));
        event(new OrderCancelledQc($order));
        
        return redirect()->back()->with('success', 'Order berhasil dibatalkan');
    }

    public function selesaikanQC(Request $request, Order $order)
{
    $request->validate([
        'items' => 'required|array',
        'items.*.id' => 'required|exists:order_items,id',
        'items.*.qty_provided' => 'required|integer|min:0',
    ]);

    $stockUpdates = DB::transaction(function () use ($request, $order) {
        $updates = [];
        
        foreach ($request->items as $itemData) {
            $orderItem = OrderItem::find($itemData['id']);
            $newQty = $itemData['qty_provided'];
            
            $stockReduction = $newQty;
            if ($order->status === 'pending' && isset($itemData['base_qty'])) {
                $stockReduction = $newQty - $itemData['base_qty'];
            }
            
            $stock = $orderItem->item->stock;
            
            if ($stockReduction > ($stock->qty ?? 0)) {
                throw new \Exception("Stok tidak mencukupi untuk item: ".$orderItem->item->nama_item);
            }
            
            if ($stockReduction > 0) {
                $stock->decrement('qty', $stockReduction);
                $updates[$orderItem->item_id] = $stock->fresh()->qty;
            }

            $orderItem->update([
                'qty_provided' => $newQty,
                'status' => $this->getItemStatus($newQty, $orderItem->qty_requested)
            ]);
        }

        event(new QtyReducedGudang());
        $order->load('orderItems');
        $order->updateStatus();
        event(new OrderStatusUpdated($order));
        event(new OrderStatusUpdatedUkur($order));
        
        return $updates;
    });

    // Broadcast stock updates after successful transaction
    foreach ($stockUpdates as $item_id => $new_stock) {
        event(new StockUpdated($item_id, $new_stock));
    }

    return redirect()->back()->with('success', 'Proses QC berhasil diselesaikan');
}

    private function getItemStatus($provided, $requested)
    {
        if ($provided === 0) return 'pending';
        if ($provided === $requested) return 'completed';
        return 'uncompleted';
    }
}
