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
use App\Events\QtyReducedGudang;
use App\Events\StockUpdated;

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

        // Efficiently update the existing stock or create a new one if it doesn't exist.
        $item->stock()->updateOrCreate(
            ['item_id' => $item->id], // Attributes to find the record by
            ['qty' => $validated['qty']]  // Attributes to update with or create with
        );

        event( new QtyReducedGudang());
        event(new StockUpdated($item->id, $validated['qty']));

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

        event( new QtyReducedGudang());
        event(new StockUpdated($item->id, 0));

        return back()->with('success', 'Stok berhasil direset menjadi 0');
    }

    public function resetAll(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        $resetItems = DB::transaction(function () {
            // Get all items before reset
            $items = Item::with('stock')->get();
            
            // Perform reset
            Stock::query()->update(['qty' => 0]);
            
            return $items;
        });

        event( new QtyReducedGudang());
        foreach ($resetItems as $item) {
            event(new StockUpdated($item->id, 0));
        }

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

        try {
            $excel->import(new class implements ToCollection, WithHeadingRow {
                public function collection($rows)
                {
                    DB::beginTransaction();
                    try {
                        foreach ($rows as $index => $row) {
                            $required = ['nama_item', 'jenjang', 'jenis_kelamin', 'size', 'qty'];
                            foreach ($required as $field) {
                                if (!isset($row[$field])) {
                                    throw new \Exception("Baris " . ($index + 2) . ": Kolom '$field' tidak ditemukan");
                                }
                            }

                            $qty = is_numeric($row['qty']) ? (int)$row['qty'] : 0;
                            $namaItem = strtolower($row['nama_item']);
                            
                            $item = Item::whereRaw('LOWER(nama_item) = ?', [$namaItem])
                                ->where('jenjang', $row['jenjang'])
                                ->where('jenis_kelamin', $row['jenis_kelamin'])
                                ->where('size', $row['size'])
                                ->first();

                            if (!$item) {
                                throw new \Exception("Baris " . ($index + 2) . ": Item tidak ditemukan - " . 
                                    $row['nama_item'] . " | " . $row['jenjang'] . " | " . 
                                    $row['jenis_kelamin'] . " | " . $row['size']);
                            }

                            // ✅ CORRECT LOGIC: Replaced the increment logic with updateOrCreate
                            $stock = Stock::firstOrNew(['item_id' => $item->id]);

                            // Tambahkan kuantitas dari Excel ke kuantitas yang ada
                            // Jika stok baru dibuat, $stock->qty akan default ke 0, jadi 0 + $qty
                            $stock->qty += $qty;

                            // Simpan perubahan ke database
                            $stock->save();
                            event(new StockUpdated($item->id, $stock->qty));
                            
                        }
                        DB::commit();
                    } catch (\Exception $e) {
                        DB::rollBack();
                        throw $e;
                    }
                }
            }, $request->file('excel_file'));

            event( new QtyReducedGudang());
            
        } catch (\Exception $e) {
            return back()->with('error', 'Terjadi kesalahan: ' . $e->getMessage());
        }
    }
}