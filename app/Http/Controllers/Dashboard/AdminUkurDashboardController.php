<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AdminUkurDashboardController extends Controller
{
    
    public function index()
    {
        $user = Auth::user();
        $orderStats = [
            'totalOrders' => Order::count(),
            'inProgressOrders' => Order::where('status', 'in-progress')->count(),
            'completedOrders' => Order::where('status', 'completed')->count(),
        ];

        return inertia('Dashboard/AdminUkur/Index', [
            'auth' => [
                'user' => [
                    'username' => $user->username,
                    'role' => $user->role,
                ]
            ],
            'orderStats' => $orderStats,
            'recentOrders' => Order::with('orderItems')
                ->latest()
                ->take(5)
                ->get()
                ->map(function ($order) {
                    return [
                        'id' => $order->id,
                        'order_number' => $order->order_number,
                        'nama_murid' => $order->nama_murid,
                        'jenjang' => $order->jenjang,
                        'created_at' => $order->created_at,
                        'status' => $order->status,
                        'return_status' => $order->return_status,
                        'edit_status' => $order->edit_status
                    ];
                })
        ]);
    }
}