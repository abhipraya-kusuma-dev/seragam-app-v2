<?php

namespace App\Http\Controllers;

use App\Exports\OrdersExport;
use App\Exports\StocksExport;
use App\Models\Order;
use App\Models\Stock;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;

class LaporanController extends Controller
{
    /**
     * Display the reports page.
     */
    public function index()
    {
        return Inertia::render('Laporan');
    }

    /**
     * Fetch data for preview.
     */
    public function preview(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'startDate' => 'nullable|date',
            'endDate' => 'nullable|date',
            'jenjang' => 'nullable|string|in:SDIT,SDS,SMP,SMA,SMK',
            'jenisKelamin' => 'nullable|string|in:Pria,Wanita',
        ]);

        $type = $request->input('type');
        $startDate = $request->input('startDate');
        $endDate = $request->input('endDate');
        $jenjang = $request->input('jenjang');
        $jenisKelamin = $request->input('jenisKelamin');

        $data = $this->getData($type, $startDate, $endDate, $jenjang, $jenisKelamin, 10); // Preview 10 items

        return response()->json($data);
    }

    /**
     * Handle the export request.
     */
    public function export(Request $request)
    {
        $request->validate([
            'type' => 'required|string',
            'startDate' => 'nullable|date',
            'endDate' => 'nullable|date',
            'jenjang' => 'nullable|string|in:SDIT,SDS,SMP,SMA,SMK',
            'jenisKelamin' => 'nullable|string|in:Pria,Wanita',
        ]);

        $type = $request->input('type');
        $startDate = $request->input('startDate');
        $endDate = $request->input('endDate');
        $jenjang = $request->input('jenjang');
        $jenisKelamin = $request->input('jenisKelamin');

        $data = $this->getData($type, $startDate, $endDate, $jenjang, $jenisKelamin);

        // Enhanced filename with filters
        $filename = 'laporan_' . $type;
        if ($jenjang) {
            $filename .= '_' . $jenjang;
        }
        if ($jenisKelamin) {
            $filename .= '_' . $jenisKelamin;
        }
        $filename .= '_' . now()->format('YmdHis') . '.xlsx';

        if (str_starts_with($type, 'stock')) {
            return Excel::download(new StocksExport($data), $filename);
        }

        return Excel::download(new OrdersExport($data), $filename);
    }

    /**
     * Get data based on report type with enhanced filtering.
     */
    private function getData(string $type, ?string $startDate, ?string $endDate, ?string $jenjang, ?string $jenisKelamin, ?int $limit = null)
    {
        switch ($type) {
            case 'order_pending':
                return $this->buildOrderQuery($startDate, $endDate, 'pending', $jenjang, $jenisKelamin, $limit);
            case 'order_completed':
                return $this->buildOrderQuery($startDate, $endDate, 'completed', $jenjang, $jenisKelamin, $limit);
            case 'order_in-progress':
                return $this->buildOrderQuery($startDate, $endDate, 'in-progress', $jenjang, $jenisKelamin, $limit);
            case 'order_all':
                return $this->buildOrderQuery($startDate, $endDate, null, $jenjang, $jenisKelamin, $limit);
            case 'stock_low':
                return $this->buildStockQuery(10, $jenjang, $jenisKelamin, $limit, '<=');
            case 'stock_all':
                return $this->buildStockQuery(null, $jenjang, $jenisKelamin, $limit);
            default:
                return collect([]);
        }
    }

    /**
     * Build the query for orders with enhanced filtering.
     */
    private function buildOrderQuery(?string $startDate, ?string $endDate, ?string $status, ?string $jenjang, ?string $jenisKelamin, ?int $limit)
    {
        $query = Order::with(['orderItems.item']);

        // Filter by status
        if ($status) {
            $query->where('status', $status);
        }

        // Filter by date range
        if ($startDate) {
            $query->whereDate('created_at', '>=', $startDate);
        }
        if ($endDate) {
            $query->whereDate('created_at', '<=', $endDate);
        }

        // Filter by jenjang (student level)
        if ($jenjang) {
            $query->where('jenjang', $jenjang);
        }

        // Filter by jenis kelamin (gender) - filter orders that contain items with specific gender
        if ($jenisKelamin) {
            $query->whereHas('orderItems.item', function ($itemQuery) use ($jenisKelamin) {
                $itemQuery->where('jenis_kelamin', $jenisKelamin);
            });
        }

        // Apply limit if specified
        if ($limit) {
            return $query->latest()->limit($limit)->get();
        }

        return $query->latest()->get();
    }

    /**
     * Build the query for stocks with enhanced filtering.
     */
    private function buildStockQuery(?int $qtyThreshold, ?string $jenjang, ?string $jenisKelamin, ?int $limit, string $operator = null)
    {
        // Start query on Stock and eager load the related Item
        $query = Stock::with('item');

        // Filter by quantity threshold (for low stock)
        if ($qtyThreshold !== null && $operator) {
            $query->where('qty', $operator, $qtyThreshold);
        }

        // Apply the combined complex filter for jenjang and jenisKelamin on the related Item
        if ($jenjang || $jenisKelamin) {
            $query->whereHas('item', function ($itemQuery) use ($jenjang, $jenisKelamin) {
                
                // Filter by jenis kelamin (gender), also including 'UNI'
                if ($jenisKelamin) {
                    $itemQuery->where(function ($q) use ($jenisKelamin) {
                        $q->where('jenis_kelamin', $jenisKelamin)
                          ->orWhere('jenis_kelamin', 'UNI');
                    });
                }

                // Filter by jenjang (education level) with complex logic
                if ($jenjang) {
                    $itemQuery->where(function ($q_jenjang) use ($jenjang) {
                        if ($jenjang === 'SDIT') {
                            $q_jenjang->where(function ($q) {
                                $q->where('jenjang', 'LIKE', '%SDIT%')
                                  ->orWhere('jenjang', 'LIKE', '%SD%');
                            })->where('jenjang', 'NOT LIKE', '%SDS%');

                        } else if ($jenjang === 'SDS') {
                            $q_jenjang->where(function ($q) {
                                $q->where('jenjang', 'LIKE', '%SDS%')
                                  ->orWhere('jenjang', 'LIKE', '%SD%');
                            })->where('jenjang', 'NOT LIKE', '%SDIT%');

                        } else {
                            // For cases like SMP, SMA, SMK:
                            // Find items that are an EXACT match OR a partial match (e.g., 'SMA-SMK')
                            $q_jenjang->where(function ($q) use ($jenjang) {
                                // 1. Find exact matches, even with extra whitespace (e.g., 'SMK ')
                                $q->whereRaw('TRIM(jenjang) = ?', [$jenjang])
                                  // 2. Also find compound matches (e.g., 'SMA-SMK')
                                  ->orWhere('jenjang', 'LIKE', '%' . $jenjang . '%');
                            });
                        }
                    });
                }
            });
        }

        // Apply limit if specified
        if ($limit) {
            return $query->limit($limit)->get();
        }

        return $query->get();
    }
}