<?php

use App\Http\Controllers\MediaController;
use Illuminate\Support\Facades\Route;

Route::get('/media', [MediaController::class, 'index']);
Route::post('/media', [MediaController::class, 'store'])->middleware('throttle:10,1');
