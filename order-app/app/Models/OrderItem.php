<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Models\Item;
use App\Models\Order;

class OrderItem extends Model
{
    use HasFactory;

    protected $fillable = ['item_id', 'order_number', 'status', 'qty_requested', 'qty_provided'];

    public function item(): BelongsTo
    {
        return $this->belongsTo(Item::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class, 'order_number', 'order_number');
    }

    // Update status and trigger order status update
    public function updateStatus(string $status): void
    {
        $this->status = $status;
        $this->save();

        // Update parent order status
        $this->order->updateStatus();
    }
}
