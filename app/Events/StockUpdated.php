<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class StockUpdated implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $item_id;
    public $new_stock;

    public function __construct($item_id, $new_stock)
    {
        $this->item_id = $item_id;
        $this->new_stock = $new_stock;
    }

    public function broadcastOn()
    {
        return [
             new PrivateChannel('qc'),
             new PrivateChannel('ukur'),
        ];
    }
}
