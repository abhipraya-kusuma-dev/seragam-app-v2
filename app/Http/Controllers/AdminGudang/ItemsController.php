<?php

namespace App\Http\Controllers\AdminGudang;

use App\Http\Controllers\Controller;
use App\Models\Item;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Excel;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\DB;

class ItemsController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        $query = Item::query();

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
                'SDIT', 'SMP', 'SMA', 'SMK', 
                'SMP-SMA-SMK', 'SD-SMP-SMA', 
                'SMA-SMK', 'SD-SMP-SMA-SMK'
            ],
            'jenisKelaminOptions' => ['Pria', 'Wanita', 'UNI'],
        ]);
    }

    public function create(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        return inertia('AdminGudang/Items/Create', [
            'jenjangOptions' => [
                'SDIT', 'SMP', 'SMA', 'SMK', 
                'SMP-SMA-SMK', 'SD-SMP-SMA', 
                'SMA-SMK', 'SD-SMP-SMA-SMK'
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
            'jenjang' => 'required|in:SDIT,SMP,SMA,SMK,SMP-SMA-SMK,SD-SMP-SMA,SMA-SMK,SD-SMP-SMA-SMK',
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

    public function import(Request $request, Excel $excel)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        $request->validate([
            'excel_file' => 'required|file|mimes:xlsx,xls|max:2048',
        ]);

        $path = $request->file('excel_file')->store('temp', 'local');

        try {
            $excel->import(new class implements ToCollection, WithHeadingRow {
                public function collection($rows)
                {
                    DB::beginTransaction();
                    try {
                        $createdCount = 0;
                        $skippedCount = 0;

                        foreach ($rows as $index => $row) {
                            // Validate required fields
                            if (!isset($row['nama_item'], $row['jenjang'], $row['jenis_kelamin'], $row['size'])) {
                                throw new \Exception("Baris " . ($index + 2) . ": Kolom wajib tidak ditemukan");
                            }

                            // Convert nama_item to lowercase
                            $namaItem = strtolower($row['nama_item']);
                            
                            // Check if item already exists with all four attributes (case-insensitive for nama_item)
                            $exists = Item::whereRaw('LOWER(nama_item) = ?', [$namaItem])
                                        ->where('jenjang', $row['jenjang'])
                                        ->where('jenis_kelamin', $row['jenis_kelamin'])
                                        ->where('size', $row['size'])
                                        ->exists();

                            if (!$exists) {
                                Item::create([
                                    'nama_item' => $namaItem,
                                    'jenjang' => $row['jenjang'],
                                    'jenis_kelamin' => $row['jenis_kelamin'],
                                    'size' => $row['size'],
                                ]);
                                $createdCount++;
                            } else {
                                $skippedCount++;
                            }
                        }
                        
                        DB::commit();
                        
                        // Add success message with counts
                        session()->flash('import_result', [
                            'created' => $createdCount,
                            'skipped' => $skippedCount
                        ]);
                        
                    } catch (\Exception $e) {
                        DB::rollBack();
                        throw $e;
                    }
                }
            }, $path);

            Storage::disk('local')->delete($path);

            return redirect()->route('admin-gudang.items.index')
                ->with('success', 'File berhasil diimpor');
        } catch (\Exception $e) {
            Storage::disk('local')->delete($path);
            return back()->with('error', 'Terjadi kesalahan: ' . $e->getMessage());
        }
    }
}