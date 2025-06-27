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

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function stock(): HasOne
    {
        return $this->hasOne(Stock::class);
    }
}
