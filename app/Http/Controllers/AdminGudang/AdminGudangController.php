<?php

namespace App\Http\Controllers\AdminGudang;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Item;

class AdminGudangController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user() || $request->user()->role !== 'admin_gudang') {
            abort(403, 'Unauthorized');
        }

        return Inertia::render('AdminGudang/Index', [
            'items' => Item::with('stock')->get()
        ]);
    }
}
