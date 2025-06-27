<?php
namespace App\Http\Controllers\AdminGudang;
use App\Events\OrderReaded;
use App\Events\OrderReturnedBack;
use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Illuminate\Validation\ValidationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Exception;

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
            ->latest()
            ->paginate($perPage);
           
        $viewedOrders = $queryBuilder()
            ->where('notif_status', true)
            ->where('return_status', false)
            ->latest()
            ->paginate($perPage);
           
        $returnedOrders = $queryBuilder()
            ->where('return_status', true)
            ->latest()
            ->paginate($perPage);
        
        // Get counts for badges
        $counts = [
            'new' => $newOrders->total(),
            'viewed' => $viewedOrders->total(),
            'returned' => $returnedOrders->total(),
        ];
        
        return Inertia::render('AdminGudang/Orders/Index', [
            'newOrders' => $newOrders,
            'viewedOrders' => $viewedOrders,
            'returnedOrders' => $returnedOrders,
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
                'notif_status' => $request->notif_status
            ]);

            event(new OrderReaded($order));

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
            'notif_status' => true,
        ]);

        event(new OrderReturnedBack($order));
        
        return back()->with('success', 'Order telah dikirim ulang ke QC');
    }
}