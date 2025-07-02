<?php

namespace App\Imports;

use App\Models\Item;
use Maatwebsite\Excel\Concerns\ToModel;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Exception;

class ItemImport implements ToModel, ToCollection, WithHeadingRow
{
    /**
    * @param array $row
    *
    * @return \Illuminate\Database\Eloquent\Model|null
    */
    public function model(array $row)
    {
        return new Item([
            'nama_item' => $row['nama_item'],
            'jenjang' => $row['jenjang'],
            'jenis_kelamin' => $row['jenis_kelamin'],
            'size' => $row['size'],
        ]);
    }

    public function collection(Collection $rows)
    {
        DB::beginTransaction();
        try {
            $createdCount = 0;
            $skippedCount = 0;

            foreach ($rows as $index => $row) {
                // Validate that essential columns are present in the row
                if (!isset($row['nama_item'], $row['jenjang'], $row['jenis_kelamin'], $row['size'])) {
                    // The row number is the index + 2 (to account for the 0-based index and the header row)
                    throw new Exception("Baris " . ($index + 2) . ": Kolom wajib tidak ditemukan. Pastikan ada kolom 'nama_item', 'jenjang', 'jenis_kelamin', dan 'size'.");
                }

                // Normalize the item name to lowercase for consistent checking
                $namaItem = strtolower($row['nama_item']);

                // Check if an item with the exact same attributes already exists
                $exists = Item::whereRaw('LOWER(nama_item) = ?', [$namaItem])
                    ->where('jenjang', $row['jenjang'])
                    ->where('jenis_kelamin', $row['jenis_kelamin'])
                    ->where('size', $row['size'])
                    ->exists();

                if (!$exists) {
                    // If it doesn't exist, create it
                    Item::create([
                        'nama_item' => $namaItem,
                        'jenjang' => $row['jenjang'],
                        'jenis_kelamin' => $row['jenis_kelamin'],
                        'size' => $row['size'],
                    ]);
                    $createdCount++;
                } else {
                    // If it already exists, skip it
                    $skippedCount++;
                }
            }

            // If everything is successful, commit the changes to the database
            DB::commit();

            // Store the results in the session to display a summary message to the user
            session()->flash('import_result', [
                'created' => $createdCount,
                'skipped' => $skippedCount,
            ]);
        } catch (Exception $e) {
            // If any error occurs, roll back the entire transaction
            DB::rollBack();
            // and re-throw the exception to be caught by the controller
            throw $e;
        }
    }
}
