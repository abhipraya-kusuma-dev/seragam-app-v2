<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use App\Models\Size;

class Item extends Model
{
    use HasFactory;

    protected $fillable = ['nama_item', 'jenjang', 'jenis_kelamin', 'size'];

    protected static function boot()
    {
        parent::boot();

        // This event will fire every time a new Item is successfully created.
        static::created(function ($item) {
            // Create a related stock record with a default quantity of 0.
            $item->stock()->create(['qty' => 0]);
        });
    }

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function stock(): HasOne
    {
        return $this->hasOne(Stock::class);
    }
}
