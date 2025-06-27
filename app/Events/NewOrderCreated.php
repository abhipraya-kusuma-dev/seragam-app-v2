<?php

namespace App\Events;

use App\Models\Order; // Pastikan path model Anda benar
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NewOrderCreated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    /**
     * Instance order yang baru saja dibuat.
     * Properti ini harus public agar bisa diakses oleh frontend.
     */
    public Order $order;

    /**
     * Buat instance event baru.
     */
    public function __construct(Order $order)
    {
        // Kita teruskan model Order agar datanya bisa digunakan di notifikasi
        $this->order = $order;

    }

    /**
     * Dapatkan channel siaran event.
     */
    public function broadcastOn(): array
    {
        // Siarkan ke channel privat yang hanya bisa didengar oleh admin gudang.
        return [
            new PrivateChannel('gudang'),
        ];
    }
}

