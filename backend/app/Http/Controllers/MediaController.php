<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

class MediaController extends Controller
{
    public function index(): JsonResponse
    {
        $items = DB::table('media')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn ($item): array => [
                'id' => $item->id,
                'title' => $item->title,
                'type' => $item->type,
                'url' => '/storage/' . ltrim($item->path, '/'),
                'created_at' => $item->created_at,
            ]);

        return response()->json($items);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'title' => ['nullable', 'string', 'max:100'],
            'file' => ['required', 'file', 'mimes:jpg,jpeg,png,gif,webp,mp4,webm', 'max:20480'],
        ]);

        $file = $request->file('file');
        $mime = $file->getMimeType();
        $type = Str::startsWith($mime, 'video/') ? 'video' : 'image';
        $title = trim((string) $request->input('title', '')) ?: 'Без названия';
        $path = $file->store('media', 'public');

        try {
            $id = DB::table('media')->insertGetId([
                'title' => $title,
                'path' => $path,
                'type' => $type,
                'mime_type' => $mime,
                'size' => $file->getSize(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (Throwable $error) {
            Storage::disk('public')->delete($path);
            throw $error;
        }

        return response()->json([
            'id' => $id,
            'title' => $title,
            'type' => $type,
            'url' => '/storage/' . ltrim($path, '/'),
            'created_at' => now()->toDateTimeString(),
        ], 201);
    }
}
