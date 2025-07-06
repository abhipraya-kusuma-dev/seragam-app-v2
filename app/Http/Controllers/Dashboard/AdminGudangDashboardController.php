<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Order;
use Illuminate\Support\Facades\Auth;
class AdminGudangDashboardController extends Controller
{
    public function index()
{
    $user = Auth::user();
    $orderStats = [
        'belum_terbaca' => Order::where('notif_status', false)->count(),
        'sudah_terbaca' => Order::where('notif_status', true)
                                 ->where('return_status', false)
                                 ->count(),
        'diedit' => Order::where('return_status', false)->where('edit_status', true)->count(),
    ];

    $recentOrders = Order::with(['orderItems.item'])
        ->orderBy('created_at', 'desc')
        ->limit(5)
        ->get()
        ->map(function ($order) {
            $status = 'belum-terbaca';
            if($order->status === 'cancelled'){
                $status = 'dibatalkan';
            } elseif (!$order->return_status && $order->edit_status) {
                $status = 'diedit';
            } elseif ($order->return_status && !$order->edit_status){
                $status = 'dikembalikan';
            } elseif ($order->notif_status) {
                $status = 'sudah-terbaca';
            }

            return [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'nama_murid' => $order->nama_murid,
                'jenjang' => $order->jenjang,
                'jenis_kelamin' => $order->jenis_kelamin,
                'status' => $status,
                'notif_status' => $order->notif_status,
                'return_status' => $order->return_status,
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at,
                'order_items' => $order->orderItems->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'qty_requested' => $item->qty_requested,
                        'qty_provided' => $item->qty_provided,
                        'status' => $item->status,
                        'item' => [
                            'id' => $item->item->id,
                            'nama_item' => $item->item->nama_item,
                            'jenjang' => $item->item->jenjang,
                            'jenis_kelamin' => $item->item->jenis_kelamin,
                            'size' => $item->item->size,
                        ]
                    ];
                })
            ];
        });

    return Inertia::render('Dashboard/AdminGudang/Index', [
        'auth' => [
            'user' => [
                'username' => $user->username,
                'role' => $user->role,
            ]
        ],
        'orderStats' => $orderStats,
        'recentOrders' => $recentOrders,
    ]);
}
}