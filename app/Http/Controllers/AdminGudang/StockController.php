<?php

namespace App\Http\Controllers\AdminGudang;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Item;
use App\Models\Stock;
use Illuminate\Support\Facades\DB;
use Maatwebsite\Excel\Excel;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Facades\Storage;

class StockController extends Controller
{
    public function show(Request $request, Item $item)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        return inertia('AdminGudang/Stock/Show', [
            'item' => $item->load('stock'),
        ]);
    }

    public function update(Request $request, Item $item)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        $validated = $request->validate([
            'qty' => 'required|integer|min:0',
        ]);

        $stock = $item->stock()->firstOrCreate([
            'item_id' => $item->id,
        ], [
            'qty' => 0,
        ]);

        $stock->update([
            'qty' => $validated['qty'],
        ]);

        return redirect()->back()->with('success', 'Stok berhasil diperbarui');
    }

    public function reset(Request $request, Item $item)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        DB::transaction(function () use ($item) {
            Stock::updateOrCreate(
                ['item_id' => $item->id],
                ['qty' => 0]
            );
        });

        return back()->with('success', 'Stok berhasil direset menjadi 0');
    }

    public function resetAll(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        DB::transaction(function () {
            Stock::query()->update(['qty' => 0]);
        });

        return back()->with('success', 'Semua stok berhasil direset menjadi 0');
    }

    public function bulkUpdateStock(Request $request, Excel $excel)
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
                        foreach ($rows as $index => $row) {
                            // Validate required columns
                            $required = ['nama_item', 'jenjang', 'jenis_kelamin', 'size', 'qty'];
                            foreach ($required as $field) {
                                if (!isset($row[$field])) {
                                    throw new \Exception("Baris " . ($index + 2) . ": Kolom '$field' tidak ditemukan");
                                }
                            }

                            // Convert quantity to integer
                            $qty = is_numeric($row['qty']) ? (int)$row['qty'] : 0;
                            
                            // Convert nama_item to lowercase for case-insensitive search
                            $namaItem = strtolower($row['nama_item']);
                            
                            // Find matching item with case-insensitive nama_item
                            $item = Item::whereRaw('LOWER(nama_item) = ?', [$namaItem])
                                        ->where('jenjang', $row['jenjang'])
                                        ->where('jenis_kelamin', $row['jenis_kelamin'])
                                        ->where('size', $row['size'])
                                        ->first();

                            if (!$item) {
                                throw new \Exception("Baris " . ($index + 2) . ": Item tidak ditemukan - " . 
                                                    $row['nama_item'] . " | " . 
                                                    $row['jenjang'] . " | " . 
                                                    $row['jenis_kelamin'] . " | " . 
                                                    $row['size']);
                            }

                            // Update or create stock
                            $stock = Stock::where('item_id', $item->id)->first();
                            
                            if ($stock) {
                                $stock->increment('qty', $qty);
                            } else {
                                Stock::create([
                                    'item_id' => $item->id,
                                    'qty' => $qty
                                ]);
                            }
                        }
                        DB::commit();
                    } catch (\Exception $e) {
                        DB::rollBack();
                        throw $e;
                    }
                }
            }, $path);

            Storage::disk('local')->delete($path);

            return back()->with('success', 'Stok berhasil diperbarui secara massal');
        } catch (\Exception $e) {
            Storage::disk('local')->delete($path);
            return back()->with('error', 'Terjadi kesalahan: ' . $e->getMessage());
        }
    }
}