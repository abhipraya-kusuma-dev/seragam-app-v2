<?php

// app/Exports/StocksExport.php

namespace App\Exports;

use App\Models\Stock;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class StocksExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles
{
    protected $stocks;

    public function __construct($stocks)
    {
        $this->stocks = $stocks;
    }

    public function collection()
    {
        return $this->stocks;
    }

    public function headings(): array
    {
        return [
            'Nama Item',
            'Jenjang',
            'Jenis Kelamin',
            'Size',
            'Stok',
        ];
    }

    public function map($stock): array
    {
        return [
            $stock->item->nama_item,
            $stock->item->jenjang,
            $stock->item->jenis_kelamin,
            $stock->item->size,
            $stock->qty === 0 ? '0' : $stock->qty,
        ];
    }

    /**
     * Menerapkan style pada sheet.
     *
     * @param Worksheet $sheet
     * @return array
     */
    public function styles(Worksheet $sheet)
    {
        return [
            1    => ['font' => ['bold' => true]],

            'D1' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT,
                ],
            ],
            
            'D2:D' . $sheet->getHighestRow() => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_RIGHT,
                ],
            ],

            'A1:' . $sheet->getHighestColumn() . $sheet->getHighestRow() => [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['argb' => '000000'],
                    ],
                ],
            ],
        ];
    }
}