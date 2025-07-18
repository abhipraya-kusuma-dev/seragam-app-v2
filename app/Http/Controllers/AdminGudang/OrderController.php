<?php
namespace App\Http\Controllers\AdminGudang;
use App\Events\OrderCancelled;
use App\Events\OrderReaded;
use App\Events\OrderReturnedBack;
use App\Events\OrderDownloaded;
use App\Events\OrderStatusUpdated;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Exception;
use Illuminate\Support\Facades\DB;
use App\Models\Stock;;
use App\Events\OrderCancelledGudang;
use App\Events\OrderCancelledQc;
use App\Events\OrderStatusUpdatedUkur;


class OrderController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }
       
        // Get filter parameters
        $search = $request->input('search', '');
        $jenjang = $request->input('jenjang', 'all');
        $gender = $request->input('gender', 'all');
        $perPage = $request->input('perPage', 10);
        
        // Base query function
        $queryBuilder = function () use ($search, $jenjang, $gender) {
            return Order::query()
                ->when($search, function ($query) use ($search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('order_number', 'like', "%{$search}%")
                          ->orWhere('nama_murid', 'like', "%{$search}%");
                    });
                })
                ->when($jenjang !== 'all', function ($query) use ($jenjang) {
                    $query->where('jenjang', $jenjang);
                })
                ->when($gender !== 'all', function ($query) use ($gender) {
                    $query->where('jenis_kelamin', $gender);
                })
                ->with('orderItems.item');
        };
        
        // Get orders segmented by status with pagination
        $newOrders = $queryBuilder()
            ->where('notif_status', false)
            ->where('return_status', false)
            ->where('edit_status', false)
            ->oldest()
            ->paginate($perPage);
           
        $viewedOrders = $queryBuilder()
            ->where('notif_status', true)
            ->where('return_status', false)
            ->where('edit_status', false)
            ->oldest()
            ->paginate($perPage);
           
        $editedOrders = $queryBuilder()
            ->where('return_status', false)
            ->where('edit_status', true)
            ->oldest()
            ->paginate($perPage);
        
        // Get counts for badges
        $counts = [
            'new' => $newOrders->total(),
            'viewed' => $viewedOrders->total(),
            'edited' => $editedOrders->total(),
        ];
        
        return Inertia::render('AdminGudang/Orders/Index', [
            'newOrders' => $newOrders,
            'viewedOrders' => $viewedOrders,
            'editedOrders' => $editedOrders,
            'counts' => $counts,
            'filters' => [
                'search' => $search,
                'jenjang' => $jenjang,
                'gender' => $gender,
                'perPage' => $perPage
            ]
        ]);
    }
    
    public function updateNotificationStatus(Request $request, $orderId)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }
        try {
            // Validate the request
            $request->validate([
                'notif_status' => 'required|boolean'
            ]);
            // Find the order
            $order = Order::findOrFail($orderId);
           
            // Update the notification status
            $order->update([
                'notif_status' => $request->notif_status,
                'return_status' => false,
                'edit_status' => false
            ]);

            event(new OrderReaded($order));
            event(new OrderDownloaded($order));

            return back()->with('success', 'Notification status updated successfully');
        } catch (ValidationException $e) {
            return back()->withErrors($e->errors());
        } catch (ModelNotFoundException $e) {
            return back()->withErrors(['order' => 'Order not found']);
        } catch (Exception $e) {
            return back()->withErrors(['error' => 'An error occurred while updating notification status']);
        }
    }
    
    public function resendToQc(Request $request, Order $order)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }
        $order->update([
            'return_status' => false,
            'edit_status' => false,
            'notif_status' => true,
        ]);

        event(new OrderReturnedBack($order));
        
        return back()->with('success', 'Order telah dikirim ulang ke QC');
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
            $order->update([
                'status' => 'cancelled',
                'edit_status' => false
            ]);
            $order->orderItems()->update([
                'qty_provided' => 0,
                'status' => 'pending'
            ]);
        });

        event(new OrderCancelledGudang($order));
        event(new OrderCancelledQc($order));
        event(new OrderCancelled($order));
        event(new OrderStatusUpdated($order));
        event(new OrderStatusUpdatedUkur($order));


        return redirect()->back()->with('success', 'Order berhasil dibatalkan');
    }
}