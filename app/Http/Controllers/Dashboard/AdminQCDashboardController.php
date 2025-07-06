<?php

namespace App\Http\Controllers\Dashboard;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AdminQCDashboardController extends Controller
{
    public function index(Request $request)
    {
        // Get authenticated user
        $user = Auth::user();
        
        // Get parameters from request
        $perPage = $request->input('perPage', 10);
        $tab = $request->input('tab', 'in-progress');
        $search = $request->input('search', '');
        $jenjang = $request->input('jenjang', '');
        $gender = $request->input('gender', '');
        
        // Base query
        $query = Order::with(['orderItems.item.stock']);
        
        // Apply search filters
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'LIKE', "%{$search}%")
                  ->orWhere('nama_murid', 'LIKE', "%{$search}%");
            });
        }
        
        if ($jenjang && $jenjang !== 'all') {
            $query->where('jenjang', $jenjang);
        }
        
        if ($gender && $gender !== 'all') {
            $query->where('jenis_kelamin', $gender);
        }
        
        // Fetch orders with different statuses with pagination
        $inProgressOrders = (clone $query)
            ->where('status', 'in-progress')
            ->where('notif_status', true)
            ->where('return_status', false)
            ->where('edit_status', false)
            ->latest()
            ->paginate($perPage, ['*'], 'inProgressPage');

        $pendingOrders = (clone $query)
            ->where('status', 'pending')
            ->where('return_status', false)
            ->latest()
            ->paginate($perPage, ['*'], 'pendingPage');

        $completedOrders = (clone $query)
            ->where('status', 'completed')
            ->where('return_status', false)
            ->latest()
            ->paginate($perPage, ['*'], 'completedPage');

        $returnedOrders = (clone $query)
            ->where('status', 'in-progress')
            ->where(function ($q) {
                $q->where('return_status', true)
                  ->orWhere('edit_status', true);
            })
            ->latest()
            ->paginate($perPage, ['*'], 'returnedPage');

        $cancelledOrders = (clone $query)
            ->where('status', 'cancelled')
            ->where('return_status', false)
            ->latest()
            ->paginate($perPage, ['*'], 'cancelledPage');

        // Calculate statistics
        $inProgress = Order::where('status', 'in-progress')->where('return_status', false)->count();
        $pending = Order::where('status', 'pending')->where('return_status', false)->count();
        $completed = Order::where('status', 'completed')->where('return_status', false)->count();
        $returned = Order::where('status', 'in-progress')->where(function($query){$query->where('return_status', true)->orWhere('edit_status', true);})->count();
        $cancelled = Order::where('status', 'cancelled')->where('return_status', false)->count();
        
        // Pass current filters to frontend
        $filters = [
            'perPage' => $perPage,
            'search' => $search,
            'jenjang' => $jenjang,
            'gender' => $gender,
            'tab' => $tab
        ];

        return Inertia::render('Dashboard/AdminQc/Index', [
            'auth' => [
                'user' => [
                    'username' => $user->username,
                    'role' => $user->role,
                ]
            ],
            'pendingOrders' => $pendingOrders,
            'completedOrders' => $completedOrders,
            'returnedOrders' => $returnedOrders,
            'inProgressOrders' => $inProgressOrders,
            'cancelledOrders' => $cancelledOrders,
            'qcStats' => [
                'inProgress' => $inProgress,
                'completed' => $completed,
                'returned' => $returned,
                'cancelled' => $cancelled,
                'pending' => $pending
            ],
            'filters' => $filters
        ]);
    }
}