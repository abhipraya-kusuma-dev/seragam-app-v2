<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use App\Models\User;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'username' => 'admin_ukur',
            'password' => Hash::make('password'),
            'role' => 'admin_ukur'
        ]);

        User::create([
            'username' => 'admin_gudang',
            'password' => Hash::make('password'),
            'role' => 'admin_gudang'
        ]);

        User::create([
            'username' => 'admin_qc',
            'password' => Hash::make('password'),
            'role' => 'admin_qc'
        ]);
    }
}
