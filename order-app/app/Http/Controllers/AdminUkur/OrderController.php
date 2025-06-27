<?php

namespace App\Http\Controllers\AdminUkur;

use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Models\Stock;
use Illuminate\Support\Facades\Auth;

class OrderController extends Controller
{
    
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_ukur') {
            abort(403, 'Unauthorized');
        }

        $orders = Order::latest()->paginate(10);

        return inertia('AdminUkur/Orders/Index', [
            'orders' => [
                'data' => $orders->items(),
                'meta' => [
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                    'from' => $orders->firstItem(),
                    'to' => $orders->lastItem(),
                    'total' => $orders->total(),
                    'links' => $orders->linkCollection()->toArray(),
                ],
                'links' => [
                    'first' => $orders->url(1),
                    'last' => $orders->url($orders->lastPage()),
                    'prev' => $orders->previousPageUrl(),
                    'next' => $orders->nextPageUrl(),
                ],
            ],
        ]);
    }

    public function create(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_ukur') {
            abort(403, 'Unauthorized');
        }

        $items = Item::with('stock')->get()->map(function ($item) {
            return [
                'id' => $item->id,
                'nama_item' => $item->nama_item,
                'jenjang' => $item->jenjang,
                'jenis_kelamin' => $item->jenis_kelamin,
                'size' => $item->size,
                'stock' => $item->stock->qty ?? 0
            ];
        });

        // Get the next order ID for preview
        $nextOrderId = (Order::max('id') ?? 0) + 1;

        return inertia('AdminUkur/Orders/Create', [
            'items' => $items,
            'jenjangOptions' => ['SDIT', 'SMP', 'SMA', 'SMK'],
            'jenisKelaminOptions' => ['Pria', 'Wanita'],
            'nextOrderId' => $nextOrderId,
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_ukur') {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'nama_murid' => 'required|string|max:255',
            'jenjang' => 'required|string|max:50',
            'jenis_kelamin' => 'required|string|max:20',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:items,id',
            'items.*.qty_requested' => 'required|integer|min:1', // Validate quantity
        ]);

        DB::transaction(function () use ($request) {
            $order = Order::create([
                'order_number' => 'ORD-' . str_pad(Order::max('id') + 1, 5, '0', STR_PAD_LEFT),
                'nama_murid' => $request->nama_murid,
                'jenjang' => $request->jenjang,
                'jenis_kelamin' => $request->jenis_kelamin,
                'status' => 'in-progress', // Already correct - keeping in-progress
            ]);

            $order->update([
                'order_number' => 'ORD-' . str_pad($order->id, 5, '0', STR_PAD_LEFT)
            ]);

            foreach ($request->items as $item) {
                // Create order item with quantity
                OrderItem::create([
                    'order_id' => $order->id,
                    'item_id' => $item['id'],
                    'order_number' => $order->order_number,
                    'status' => 'in-progress', // Changed from 'in-progress' to 'in-progress' (keeping consistent)
                    'qty_requested' => $item['qty_requested'],
                    'qty_provided' => 0, // Initially 0
                ]);

            }
        });

        return redirect()->route('admin-ukur.orders.index')
            ->with('success', 'Order berhasil dibuat');
    }

    public function show(Request $request, Order $order)
    {
        if (!$request->user() || $request->user()->role !== 'admin_ukur') {
            abort(403, 'Unauthorized');
        }

        $order->load('orderItems.item');
        
        return inertia('AdminUkur/Orders/Show', [
            'order' => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'nama_murid' => $order->nama_murid,
                'jenjang' => $order->jenjang,
                'jenis_kelamin' => $order->jenis_kelamin,
                'created_at' => $order->created_at,
                'items' => $order->orderItems->map(function ($orderItem) {
                    return [
                        'id' => $orderItem->item->id,
                        'nama_item' => $orderItem->item->nama_item,
                        'jenjang' => $orderItem->item->jenjang,
                        'jenis_kelamin' => $orderItem->item->jenis_kelamin,
                        'size' => $orderItem->item->size,
                        'qty_requested' => $orderItem->qty_requested,
                        'qty_provided' => $orderItem->qty_provided,
                    ];
                })->toArray(),
            ],
        ]);
    }
}