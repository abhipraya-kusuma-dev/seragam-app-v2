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
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('nama_item');
            $table->enum('jenjang', ['SDIT', 'SDS', 'SMP', 'SMA', 'SMK', 'SD-SMP', 'SD-SMP-SMA-SMK', 'SMP-SMA-SMK', 'SD-SMP-SMA', 'SMA-SMK']);
            $table->enum('jenis_kelamin', ['Pria', 'Wanita', 'UNI']);
            $table->string('size');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
