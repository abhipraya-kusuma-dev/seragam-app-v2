<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->onDelete('cascade');
            $table->string('order_number');
            $table->foreign('order_number')->references('order_number')->on('orders')->onDelete('cascade');
            $table->enum('status', ['in-progress', 'completed', 'pending', 'uncompleted'])->default('in-progress');
            $table->integer('qty_requested')->default(1); // Requested quantity
            $table->integer('qty_provided')->default(0);  // Provided quantity (initially 0)
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
