<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\OrderItem;

class Order extends Model
{
    use HasFactory;

    protected $fillable = ['order_number', 'nama_murid', 'jenjang', 'jenis_kelamin', 'status', 'notif_status', 'return_status', 'created_at', 'updated_at', 'edit_status', 'locked_at'];

    protected $casts = [
        'notif_status' => 'boolean',
        'return_status' => 'boolean',
        'edit_status' => 'boolean',
        'locked_at' => 'datetime'
    ];

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class, 'order_number', 'order_number');
    }

    // Update status based on order items
    public function updateStatus(): void
    {
        // Don't update cancelled orders
        if ($this->status === 'cancelled') {
            return;
        }

        $allCompleted = true;
        $hasPending = false;

        foreach ($this->orderItems as $item) {
            if ($item->status === 'pending') {
                $hasPending = true;
            }
            if ($item->status !== 'completed') {
                $allCompleted = false;
            }
        }

        // Apply business rules
        if ($allCompleted) {
            $this->status = 'completed';
        } elseif ($hasPending) {
            $this->status = 'pending';
        } else {
            // Check for uncompleted items
            $hasUncompleted = $this->orderItems->contains('status', 'uncompleted');
            $this->status = $hasUncompleted ? 'pending' : 'in-progress';
        }

        $this->save();
    }
}
