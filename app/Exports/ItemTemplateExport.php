<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use App\Models\Item;

class ItemTemplateExport implements FromCollection, WithHeadings, ShouldAutoSize, WithStyles
{
    /**
     * Mengambil data dari database
     */
    public function collection()
    {
        return Item::query()
            ->orderBy('jenjang')
            ->orderBy('jenis_kelamin')
            ->orderBy('nama_item')
            ->get()
            ->map(function ($item) {
                return [
                    'nama_item' => $item->nama_item,
                    'jenjang' => $item->jenjang,
                    'jenis_kelamin' => $item->jenis_kelamin,
                    'size' => $item->size,
                    'qty' => '0' // Default value untuk kolom qty
                ];
            });
    }

    /**
     * Header untuk Excel
     */
    public function headings(): array
    {
        return [
            'nama_item',
            'jenjang',
            'jenis_kelamin',
            'size',
            'qty'
        ];
    }

    /**
     * Styling untuk Excel
     */
    public function styles(Worksheet $sheet)
    {
        return [
            // Style untuk header (baris pertama)
            1 => [
                'font' => ['bold' => true],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'color' => ['argb' => 'FFD9D9D9']
                ]
            ],
            
            // Style untuk seluruh kolom
            'A:E' => [
                'alignment' => [
                    'vertical' => \PhpOffice\PhpSpreadsheet\Style\Alignment::VERTICAL_CENTER
                ]
            ]
        ];
    }
}