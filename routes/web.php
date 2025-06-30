<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AdminGudang\ItemsController;
use App\Http\Controllers\AdminGudang\StockController;
use App\Http\Controllers\AdminUkur\OrderController as AdminUkurOrderController;
use App\Http\Controllers\AdminGudang\OrderController as AdminGudangOrderController;
use App\Http\Controllers\AdminQC\OrderController as AdminQCOrderController;
use Illuminate\Support\Facades\Auth;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Dashboard\AdminUkurDashboardController;
use App\Http\Controllers\Dashboard\AdminGudangDashboardController;
use App\Http\Controllers\Dashboard\AdminQCDashboardController;
use Illuminate\Http\Request;

Route::middleware('guest')->get('/', [AuthenticatedSessionController::class, 'create'])->name('home');

Route::middleware(['auth'])->get('/dashboard', function (Request $request) {
    $user = Auth::user();
    if ($user->role === 'admin_ukur') {
        return app()->make(AdminUkurDashboardController::class)->index();
    } elseif ($user->role === 'admin_gudang') {
        return app()->make(AdminGudangDashboardController::class)->index();
    } elseif ($user->role === 'admin_qc') {
        return app()->make(AdminQCDashboardController::class)->index($request);
    }
    return abort(403);
})->name('dashboard');

// Admin Gudang Routes
Route::middleware(['auth'])->prefix('/admin/gudang')->group(function () {
    // Items routes
    Route::get('/items/create', [ItemsController::class, 'create'])
        ->name('admin-gudang.items.create');
    Route::resource('/items', ItemsController::class)
        ->except(['show'])->names('admin-gudang.items');
    Route::post('/items/import', [ItemsController::class, 'import'])
        ->name('admin-gudang.items.import');

    // Route download excel template
    Route::get('/items/template', [ItemsController::class, 'downloadTemplate'])->name('admin-gudang.items.template');
    
    // Stock routes
    Route::get('/items/{item}/stock', [StockController::class, 'show'])
        ->name('admin-gudang.stock.show');
    Route::put('/items/{item}/stock', [StockController::class, 'update'])
        ->name('admin-gudang.stock.update');
    Route::post('/items/bulk-update-stock', [StockController::class, 'bulkUpdateStock'])
        ->name('admin-gudang.items.bulk-update-stock');        
    Route::get('/templates/template_stok', function () {
        return response()->download(public_path('templates/template_stok.xlsx'));
    })->name('template.stok');
    Route::post('/stock/reset-all', [StockController::class, 'resetAll'])
        ->name('admin-gudang.stock.reset-all');
    Route::post('/items/{item}/stock/reset', [StockController::class, 'reset'])
        ->name('admin-gudang.stock.reset');

    //Order routes
    Route::get('/orders', [AdminGudangOrderController::class, 'index'])
        ->name('admin-gudang.orders.index');
    Route::patch('/orders/{order}/notification-status', [AdminGudangOrderController::class, 'updateNotificationStatus'])
        ->name('admin-gudang.orders.notification-status');
    Route::post('/orders/{order}/resend', [AdminGudangOrderController::class, 'resendToQc'])
        ->name('admin-gudang.orders.resend');
});

// Admin Ukur Routes
Route::middleware(['auth'])->prefix('admin/ukur')->group(function () {    
    Route::get('/orders', [AdminUkurOrderController::class, 'index'])->name('admin-ukur.orders.index');
    Route::get('/orders/create', [AdminUkurOrderController::class, 'create'])->name('admin-ukur.orders.create');
    Route::post('/orders', [AdminUkurOrderController::class, 'store'])->name('admin-ukur.orders.store');
    Route::get('/orders/{order}', [AdminUkurOrderController::class, 'show'])->name('admin-ukur.orders.show');
});

// Admin QC Routes
Route::middleware(['auth'])->prefix('admin/qc')->group(function () {
    
    Route::get('/orders', [AdminQCOrderController::class, 'index'])->name('admin-qc.orders.index');
    Route::patch('/orders/{order}/return', [AdminQCOrderController::class, 'kembalikanOrder'])->name('admin-qc.orders.return');
    Route::patch('/orders/{order}/cancel', [AdminQCOrderController::class, 'batalkanOrder'])->name('admin-qc.orders.cancel');
    Route::patch('/orders/{order}/complete-qc', [AdminQCOrderController::class, 'selesaikanQC'])->name('admin-qc.orders.complete-qc');
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
