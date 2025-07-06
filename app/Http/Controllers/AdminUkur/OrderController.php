<?php

namespace App\Http\Controllers\AdminUkur;

use App\Events\NewOrderNumber;
use App\Http\Controllers\Controller;
use App\Models\Item;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use App\Models\Stock;
use Illuminate\Support\Facades\Auth;
use App\Events\NewOrderCreated;
use App\Events\NewOrderCreatedUkur;
use App\Events\OrderEdited;


class OrderController extends Controller
{
    
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_ukur') {
            abort(403, 'Unauthorized');
        }

        $filters = $request->only(['search', 'jenjang', 'gender', 'tab']);

        // Base query for "all" orders (not returned)
        $ordersQuery = Order::query()
            ->where('return_status', false)
            ->select('id', 'order_number', 'nama_murid', 'jenjang', 'jenis_kelamin', 'created_at', 'status', 'edit_status', 'locked_at');

        // Base query for "returned" orders
        $returnedOrdersQuery = Order::query()
            ->where('return_status', true)
            ->where('edit_status', false)
            ->select('id', 'order_number', 'nama_murid', 'jenjang', 'jenis_kelamin', 'created_at', 'status', 'return_status', 'locked_at');

        // Apply filters to both queries
        foreach ([$ordersQuery, $returnedOrdersQuery] as $query) {
            $query->when($request->input('search'), function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                      ->orWhere('nama_murid', 'like', "%{$search}%");
                });
            })->when($request->input('jenjang') && $request->input('jenjang') !== 'all', function ($query, $jenjang) {
                $query->where('jenjang', $jenjang);
            })->when($request->input('gender') && $request->input('gender') !== 'all', function ($query) use ($request) {
                $gender = $request->input('gender'); 
                $query->where('jenis_kelamin', $gender);
            });
        }
        
        // Get the counts *after* applying filters
        $counts = [
            'all' => $ordersQuery->count(),
            'returned' => $returnedOrdersQuery->count(),
        ];

        // Paginate the results and preserve the query string for filter persistence
        $orders = $ordersQuery->latest()->paginate(10, ['*'], 'ordersPage')->withQueryString();
        $returnedOrders = $returnedOrdersQuery->orderBy('order_number', 'asc')->paginate(10, ['*'], 'returnedOrdersPage')->withQueryString();

        return Inertia('AdminUkur/Orders/Index', [
            'orders' => [
                'data' => $orders->items(),
                'meta' => [
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                    'from' => $orders->firstItem(),
                    'to' => $orders->lastItem(),
                    'total' => $orders->total(),
                    'per_page' => $orders->perPage(), // Added per_page for completeness
                    'links' => $orders->linkCollection()->toArray(),
                ],
                'links' => [
                    'first' => $orders->url(1),
                    'last' => $orders->url($orders->lastPage()),
                    'prev' => $orders->previousPageUrl(),
                    'next' => $orders->nextPageUrl(),
                ],
            ],
            'returnedOrders' => [
                'data' => $returnedOrders->items(),
                'meta' => [
                    'current_page' => $returnedOrders->currentPage(),
                    'last_page' => $returnedOrders->lastPage(),
                    'from' => $returnedOrders->firstItem(),
                    'to' => $returnedOrders->lastItem(),
                    'total' => $returnedOrders->total(),
                    'per_page' => $returnedOrders->perPage(), // Added per_page for completeness
                    'links' => $returnedOrders->linkCollection()->toArray(),
                ],
                'links' => [
                    'first' => $returnedOrders->url(1),
                    'last' => $returnedOrders->url($returnedOrders->lastPage()),
                    'prev' => $returnedOrders->previousPageUrl(),
                    'next' => $returnedOrders->nextPageUrl(),
                ],
            ],
            'counts' => $counts,
            'filters' => $filters,
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
            'jenjangOptions' => ['SDIT', 'SDS', 'SMP', 'SMA', 'SMK'],
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

            event(new NewOrderNumber($order->id));

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

            DB::afterCommit(function () use ($order) {
                event(new NewOrderCreated($order));
                event(new NewOrderCreatedUkur($order));
            });
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

    public function editData(Request $request, Order $order)
    {
        if (!$request->user() || $request->user()->role !== 'admin_ukur') {
            abort(403, 'Unauthorized');
        }

        // Get all items
        $orderJenjang = $order->jenjang;

        // Get items filtered by the order's jenis_kelamin and a flexible jenjang match.
        $items = Item::with('stock')
        ->where('jenis_kelamin', $order->jenis_kelamin)
        ->where(function ($query) use ($orderJenjang) {
            
            if ($orderJenjang === 'SDIT') {
                // For SDIT: Find items containing 'SDIT' or 'SD', but explicitly exclude any 'SDS' items.
                $query->where(function ($q) {
                    $q->where('jenjang', 'LIKE', '%SDIT%')
                    ->orWhere('jenjang', 'LIKE', '%SD%');
                })->where('jenjang', 'NOT LIKE', '%SDS%');

            } else if ($orderJenjang === 'SDS') {
                // For SDS: Find items containing 'SDS' or 'SD', but explicitly exclude any 'SDIT' items.
                $query->where(function ($q) {
                    $q->where('jenjang', 'LIKE', '%SDS%')
                    ->orWhere('jenjang', 'LIKE', '%SD%');
                })->where('jenjang', 'NOT LIKE', '%SDIT%');

            } else {
                // For all other cases (SMP, SMA, etc.), use the general search.
                $query->where('jenjang', 'LIKE', '%' . $orderJenjang . '%');
            }
        })
        ->get()
        ->map(function ($item) {
            return [
                'id' => $item->id,
                'nama_item' => $item->nama_item,
                'jenjang' => $item->jenjang,
                'jenis_kelamin' => $item->jenis_kelamin,
                'size' => $item->size,
                'stock' => $item->stock->qty ?? 0
            ];
        });

        // Get order items
        $order->load('orderItems.item');
        $orderItems = $order->orderItems->map(function ($orderItem) {
            return [
                'id' => $orderItem->item->id,
                'nama_item' => $orderItem->item->nama_item,
                'jenjang' => $orderItem->item->jenjang,
                'jenis_kelamin' => $orderItem->item->jenis_kelamin,
                'size' => $orderItem->item->size,
                'stock' => $orderItem->item->stock->qty ?? 0,
                'qty_requested' => $orderItem->qty_requested,
                'qty_provided' => $orderItem->qty_provided,
            ];
        });

        return response()->json([
            'items' => $items,
            'orderItems' => $orderItems,
        ]);
    }

    public function update(Request $request, Order $order)
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
            'items.*.qty_requested' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($request, $order) {
            // Update order details
            $order->update([
                'nama_murid' => $request->nama_murid,
                'jenjang' => $request->jenjang,
                'jenis_kelamin' => $request->jenis_kelamin,
                'return_status' => false,
                'edit_status' => true,
                'locked_at' => null
            ]);

            // Get IDs of items from the request
            $submittedItemIds = collect($request->items)->pluck('id');

            // Delete order items that are no longer in the request
            $order->orderItems()->whereNotIn('item_id', $submittedItemIds)->delete();

            // Update existing items or create new ones
            foreach ($request->items as $itemData) {
                $order->orderItems()->updateOrCreate(
                    [
                        // Match existing item by its ID
                        'item_id'  => $itemData['id'],
                    ],
                    [
                        // Update or create with these values
                        'qty_requested' => $itemData['qty_requested'],
                        'order_number'  => $order->order_number,
                        'status'        => $order->status,
                        'qty_provided'  => $itemData['qty_provided'],
                    ]
                );
            }
        });

        event(new OrderEdited($order));

        return redirect()->back()->with('success', 'Proses pengeditan berhasil diselesaikan');
    }
}