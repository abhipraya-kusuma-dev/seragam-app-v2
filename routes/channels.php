<?php

use Illuminate\Support\Facades\Broadcast;

// Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
//     return (int) $user->id === (int) $id;
// });

// Nama channel di sini *tanpa* prefix 'private-'. Laravel menanganinya otomatis.
Broadcast::channel('gudang', function ($user) {
    // Ensure we're authorizing the correct channel name
    return $user && $user->role === 'admin_gudang';
});

Broadcast::channel('qc', function ($user) {
    // Ensure we're authorizing the correct channel name
    return $user && $user->role === 'admin_qc';
});

Broadcast::channel('ukur', function ($user) {
    // Ensure we're authorizing the correct channel name
    return $user && $user->role === 'admin_ukur';
});

// // Channel default, baik untuk dimiliki
// Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
//     return (int) $user->id === (int) $id;
// });