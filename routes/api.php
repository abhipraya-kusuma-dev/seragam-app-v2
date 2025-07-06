<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Events\TriggerPopupGudang;
use App\Events\TriggerPopupQc;
use App\Events\TriggerPopupUkur;
use App\Models\Order;

Route::prefix("trigger")->group(function() {
    Route::post("/popup-gudang-open", function (Request $request) { 
        event(new TriggerPopupGudang($request->orderNumber, $request->modalState));
        return response()->json([]);
    });
    Route::post("/popup-gudang-closed", function (Request $request) { 
        event(new TriggerPopupGudang($request->orderNumber, $request->modalState));
        return response()->json([]);
    });

    Route::post("/popup-qc-open", function (Request $request) { 
        event(new TriggerPopupQc(orderNumber: $request->orderNumber, modalState: $request->modalState));
        return response()->json(data: []);
    });
    Route::post("/popup-qc-closed", function (Request $request) { 
        event(new TriggerPopupQc(orderNumber: $request->orderNumber, modalState: $request->modalState));
        return response()->json(data: []);
    });

    Route::post("/popup-ukur-open", function (Request $request) { 
        // Direct update without fetching model
        Order::where('order_number', $request->orderNumber)
            ->update(['locked_at' => now()]);
        
        event(new TriggerPopupUkur(orderNumber: $request->orderNumber, modalState: $request->modalState));
        return response()->json([]);
    });

    Route::post("/popup-ukur-closed", function (Request $request) { 
        // Direct update without fetching model
        Order::where('order_number', $request->orderNumber)
            ->update(['locked_at' => null]);
        
        event(new TriggerPopupUkur(orderNumber: $request->orderNumber, modalState: $request->modalState));
        return response()->json([]);
    });
});
