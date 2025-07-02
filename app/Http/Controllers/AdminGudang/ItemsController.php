<?php

namespace App\Http\Controllers\AdminGudang;

use App\Events\QtyReducedGudang;
use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\DB;
use App\Exports\ItemTemplateExport;
use App\Imports\ItemImport;

class ItemsController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        $query = Item::query();

        $lowStockItems = Item::whereHas('stock', function ($query) {
            $query->where('qty', '<=', 10);
        })->with('stock')->get()->map(function ($item) {
            return [
                'id' => $item->id,
                'nama_item' => $item->nama_item,
                'jenjang' => $item->jenjang,
                'jenis_kelamin' => $item->jenis_kelamin,
                'size' => $item->size,
                'qty' => $item->stock->qty ?? 0,
            ];
        });

        // Apply filters
        if ($request->has('jenjang')) {
            $query->where('jenjang', $request->jenjang);
        }
        if ($request->has('jenis_kelamin')) {
            $query->where('jenis_kelamin', $request->jenis_kelamin);
        }
        if ($request->has('search')) {
            $searchTerm = strtolower($request->search);
            $query->whereRaw('LOWER(nama_item) LIKE ?', ['%' . $searchTerm . '%']);
        }

        // Add pagination (10 items per page)
        $items = $query->with('stock')->paginate(10)->appends([
            'search' => $request->search,
            'jenjang' => $request->jenjang,
            'jenis_kelamin' => $request->jenis_kelamin
        ]);


        return Inertia('AdminGudang/Items/Index', [
            'items' => $items,
            'filters' => [
                'jenjang' => $request->jenjang,
                'jenis_kelamin' => $request->jenis_kelamin,
                'search' => $request->search,
            ],
            'jenjangOptions' => [
                'SDIT',
                'SDS',
                'SD',
                'SMP',
                'SMA',
                'SMK',
                'SD-SMP',
                'SMP-SMA-SMK',
                'SD-SMP-SMA',
                'SMA-SMK',
                'SD-SMP-SMA-SMK'
            ],
            'jenisKelaminOptions' => ['Pria', 'Wanita', 'UNI'],
            'templateUrl' => route('admin-gudang.items.template'),
            'lowStockItems' => $lowStockItems,
        ]);
    }

    public function downloadTemplate(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        return Excel::download(new ItemTemplateExport, 'template_stok.xlsx');
    }

    public function create(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        return inertia('AdminGudang/Items/Create', [
            'jenjangOptions' => [
                'SDIT',
                'SDS',
                'SD',
                'SMP',
                'SMA',
                'SMK',
                'SD-SMP',
                'SMP-SMA-SMK',
                'SD-SMP-SMA',
                'SMA-SMK',
                'SD-SMP-SMA-SMK'
            ],
            'jenisKelaminOptions' => ['Pria', 'Wanita', 'UNI'],
        ]);
    }

    public function store(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'nama_item' => 'required|string',
            'jenjang' => 'required|in:SDIT,SDS,SD,SMP,SMA,SMK,SD-SMP,SMP-SMA-SMK,SD-SMP-SMA,SMA-SMK,SD-SMP-SMA-SMK',
            'jenis_kelamin' => 'required|in:Pria,Wanita,UNI',
            'size' => 'required|string',
        ]);

        // Convert nama_item to lowercase
        $validated['nama_item'] = strtolower($validated['nama_item']);

        // Check if item already exists (case-insensitive)
        $exists = Item::whereRaw('LOWER(nama_item) = ?', [$validated['nama_item']])
            ->where('jenjang', $validated['jenjang'])
            ->where('jenis_kelamin', $validated['jenis_kelamin'])
            ->where('size', $validated['size'])
            ->exists();

        if ($exists) {
            return back()->with('error', 'Item dengan nama, jenjang, jenis kelamin, dan ukuran yang sama sudah ada');
        }

        Item::create($validated);

        return redirect()->route('admin-gudang.items.index')
            ->with('success', 'Item berhasil ditambahkan');
    }

    public function import(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        $valid =$request->validate([
            'excel_file' => 'required|file|mimes:xlsx,xls',
        ]);
        try {
            Excel::import(new ItemImport, $request->file('excel_file'));
            return redirect()->route('admin-gudang.items.index')
            ->with('success', 'File berhasil diimpor');
        } catch (\Exception $e) {
            dd($e);
            return back()->with('error', 'Terjadi kesalahan: ' . $e->getMessage());
        } 
    }
}