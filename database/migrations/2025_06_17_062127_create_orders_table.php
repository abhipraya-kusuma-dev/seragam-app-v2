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
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number')->unique();
            $table->string('nama_murid');
            $table->enum('jenjang', ['SDIT', 'SMP', 'SMA', 'SMK']);
            $table->enum('jenis_kelamin', ['Pria', 'Wanita']);
            $table->enum('status', ['in-progress', 'completed', 'pending', 'cancelled'])->default('in-progress');
            $table->boolean('notif_status')->default(false);
            $table->boolean('return_status')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
