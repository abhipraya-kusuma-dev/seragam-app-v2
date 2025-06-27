<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Models\Item;

class Size extends Model
{
    use HasFactory;

    protected $fillable = ['size'];

    public function items(): HasMany
    {
        return $this->hasMany(Item::class);
    }
}
