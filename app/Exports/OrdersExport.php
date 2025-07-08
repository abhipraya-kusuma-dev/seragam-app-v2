<?php
// app/Exports/OrdersExport.php
namespace App\Exports;

use App\Models\Order;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Alignment;

class OrdersExport implements FromCollection, WithHeadings, WithMapping, ShouldAutoSize, WithStyles, WithEvents
{
    protected $orders;
    protected $mergeCells = [];
    protected $currentRow = 2; // Start from row 2 (after header)

    public function __construct($orders)
    {
        $this->orders = $orders;
    }

    public function collection()
    {
        return $this->orders;
    }

    public function headings(): array
    {
        return [
            'Order Number',
            'Nama Murid',
            'Jenjang',
            'Jenis Kelamin',
            'Status Order',
            'Dibuat',
            'Nama Item',
            'Jenjang',
            'Jenis Kelamin',
            'Size',
            'Diminta',
            'Diberikan',
        ];
    }

    public function map($order): array
    {
        $rows = [];
        $firstItem = true;
        $startRow = $this->currentRow;
        
        foreach ($order->orderItems as $item) {
            $rowData = [
                $firstItem ? $order->order_number : '',
                $firstItem ? $order->nama_murid : '',
                $firstItem ? $order->jenjang : '',
                $firstItem ? $order->jenis_kelamin : '',
                $firstItem ?
                    ($order->status === 'pending' ? 'Pending' :
                    ($order->status === 'completed' ? 'Selesai' :
                    ($order->status === 'cancelled' ? 'Dibatalkan' : 'Sedang Diproses')))
                    : '',
                $firstItem ? $order->created_at->format('d F Y') : '',  
                $item->item->nama_item,
                $item->item->jenjang,
                $item->item->jenis_kelamin,
                $item->item->size,
                $item->qty_requested,
                $item->qty_provided === 0 ? "0" : $item->qty_provided,
            ];
            
            $rows[] = $rowData;
            $firstItem = false;
            $this->currentRow++;
        }
        
        // Store merge information for orders with multiple items
        if (count($rows) > 1) {
            $endRow = $this->currentRow - 1;
            $this->mergeCells[] = [
                'range' => "A{$startRow}:A{$endRow}",
                'value' => $order->order_number
            ];
            $this->mergeCells[] = [
                'range' => "B{$startRow}:B{$endRow}",
                'value' => $order->nama_murid
            ];
            $this->mergeCells[] = [
                'range' => "C{$startRow}:C{$endRow}",
                'value' => $order->jenjang
            ];
            $this->mergeCells[] = [
                'range' => "D{$startRow}:D{$endRow}",
                'value' => $order->jenis_kelamin
            ];
            $this->mergeCells[] = [
                'range' => "E{$startRow}:E{$endRow}",
                'value' => ($order->status === 'pending' ? 'Pending' :
                    ($order->status === 'completed' ? 'Selesai' :
                    ($order->status === 'cancelled' ? 'Dibatalkan' : 'Sedang Diproses')))
            ];
            $this->mergeCells[] = [
                'range' => "F{$startRow}:F{$endRow}",
                'value' => $order->created_at->format('d F Y')
            ];
        }
        
        // If an order has no items, still show the order
        if (count($rows) === 0) {
            $this->currentRow++;
            return [
                $order->order_number,
                $order->nama_murid,
                $order->jenjang,
                $order->jenis_kelamin,
                ($order->status === 'pending' ? 'Pending' :
                ($order->status === 'completed' ? 'Selesai' :
                ($order->status === 'cancelled' ? 'Dibatalkan' : 'Sedang Diproses'))),
                $order->created_at->format('d F Y'),
                '', '', '', '', '', ''
            ];
        }
        
        return $rows;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            // Style the first row as bold
            1 => [
                'font' => ['bold' => true],
            ],
            // Menargetkan kolom J (kolom ke-10)
            'J' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_RIGHT,
                ],
            ],
            'A' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ],
            'B' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ],
            'C' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ],
            'D' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ],
            'E' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ],
            'F' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                ],
            ],
            // Menargetkan kolom K dan L (kolom ke-11 dan 12)
            'K:L' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_RIGHT,
                ],
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet->getDelegate();
                
                // Get the highest row and column
                $highestRow = $sheet->getHighestRow();
                $highestColumn = $sheet->getHighestColumn();
                
                // Apply borders to all cells with data
                $sheet->getStyle("A1:{$highestColumn}{$highestRow}")->applyFromArray([
                    'borders' => [
                        'allBorders' => [
                            'borderStyle' => Border::BORDER_THIN,
                            'color' => ['argb' => '000000'],
                        ],
                    ],
                ]);

                // Apply header styling
                $sheet->getStyle("A1:{$highestColumn}1")->applyFromArray([
                    'font' => [
                        'bold' => true,
                        'size' => 12,
                    ],
                    'fill' => [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'color' => ['argb' => 'FFE6E6E6'],
                    ],
                    'alignment' => [
                        'horizontal' => Alignment::HORIZONTAL_CENTER,
                        'vertical' => Alignment::VERTICAL_CENTER,
                    ],
                ]);

                // Apply merge cells and center alignment
                foreach ($this->mergeCells as $mergeInfo) {
                    $sheet->mergeCells($mergeInfo['range']);
                    $sheet->getStyle($mergeInfo['range'])->applyFromArray([
                        'alignment' => [
                            'horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical' => Alignment::VERTICAL_CENTER,
                        ],
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => Border::BORDER_THIN,
                                'color' => ['argb' => '000000'],
                            ],
                        ],
                    ]);
                    
                    // Set the value for merged cells
                    $firstCell = explode(':', $mergeInfo['range'])[0];
                    $sheet->setCellValue($firstCell, $mergeInfo['value']);
                }

                // Apply alternating row colors for better readability
                $this->applyAlternatingRowColors($sheet, $highestRow, $highestColumn);
                
                // Apply status-based coloring
                $this->applyStatusColoring($sheet, $highestRow);
            },
        ];
    }

    /**
     * Apply alternating row colors
     */
    private function applyAlternatingRowColors(Worksheet $sheet, int $highestRow, string $highestColumn)
    {
        for ($row = 2; $row <= $highestRow; $row++) {
            if ($row % 2 == 0) {
                $sheet->getStyle("A{$row}:{$highestColumn}{$row}")->applyFromArray([
                    'fill' => [
                        'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                        'color' => ['argb' => 'FFF8F8F8'],
                    ],
                ]);
            }
        }
    }

    /**
     * Apply status-based coloring
     */
    private function applyStatusColoring(Worksheet $sheet, int $highestRow)
    {
        for ($row = 2; $row <= $highestRow; $row++) {
            $statusCell = $sheet->getCell("E{$row}")->getValue();
            
            if ($statusCell) {
                $color = '';
                switch ($statusCell) {
                    case 'Pending':
                        $color = 'FFFFEAA7'; // Light orange
                        break;
                    case 'Selesai':
                        $color = 'FFD4FFC7'; // Light green
                        break;
                    case 'Dibatalkan':
                        $color = 'FFFF7675'; // Light red
                        break;
                    case 'Sedang Diproses':
                        $color = 'FFB3E5FC'; // Light blue
                        break;
                }
                
                if ($color) {
                    $sheet->getStyle("E{$row}")->applyFromArray([
                        'fill' => [
                            'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                            'color' => ['argb' => $color],
                        ],
                    ]);
                }
            }
        }
    }
}