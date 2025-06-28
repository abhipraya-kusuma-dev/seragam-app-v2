<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Events\TriggerPopupGudang;
use App\Events\TriggerPopupQc;

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
});
