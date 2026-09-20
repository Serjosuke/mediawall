"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Media = {
  id: number;
  title: string;
  type: "image" | "video";
  url: string;
  created_at: string;
};

type Filter = "all" | "image" | "video";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "video/mp4",
  "video/webm",
];

export default function Home() {
  const [items, setItems] = useState<Media[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selected, setSelected] = useState<Media | null>(null);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/media", { cache: "no-store" });
      if (!response.ok) throw new Error("Не удалось получить публикации");
      const data: Media[] = await response.json();
      setItems(data);
      setError("");
    } catch {
      setError("Нет соединения с сервером. Галерея повторит запрос автоматически.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setUploadOpen(false);
      }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, []);

  const visibleItems = items.filter((item) => filter === "all" || item.type === filter);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setUploadError("");
    const nextFile = event.target.files?.[0] ?? null;
    if (!nextFile) {
      setFile(null);
      return;
    }
    if (!ALLOWED_TYPES.includes(nextFile.type)) {
      setFile(null);
      setUploadError("Поддерживаются JPG, PNG, GIF, WEBP, MP4 и WEBM.");
      return;
    }
    if (nextFile.size > MAX_FILE_SIZE) {
      setFile(null);
      setUploadError("Размер файла не должен превышать 20 МБ.");
      return;
    }
    setFile(nextFile);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setUploadError("");
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("title", title.trim());
      const response = await fetch("/api/media", {
        method: "POST",
        headers: { Accept: "application/json" },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.errors?.file?.[0] ?? result.message ?? "Ошибка загрузки");
      }
      setItems((current) => [result as Media, ...current.filter((item) => item.id !== result.id)].slice(0, 100));
      setFilter("all");
      setTitle("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      setUploadOpen(false);
      void refresh();
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Не удалось загрузить файл");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <a href="/" className="logo" aria-label="MediaWall — главная">
          <span className="logo-mark">M</span>
          <span>MediaWall</span>
        </a>
        <button className="primary-button" onClick={() => { setUploadError(""); setUploadOpen(true); }}>
          <span aria-hidden="true">＋</span> Загрузить
        </button>
      </header>

      <section className="hero">
        <p className="eyebrow">ОБЩАЯ ГАЛЕРЕЯ</p>
        <h1>Делись моментами.<br /><span>Смотри и вдохновляйся.</span></h1>
        <p className="lead">Загружай фотографии и видео. Новые публикации доступны всем, кто открыл эту галерею.</p>
      </section>

      <section className="toolbar" aria-label="Фильтр публикаций">
        <div className="filters">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Все</button>
          <button className={filter === "image" ? "active" : ""} onClick={() => setFilter("image")}>Фото</button>
          <button className={filter === "video" ? "active" : ""} onClick={() => setFilter("video")}>Видео</button>
        </div>
        <span className="count">Публикаций: {visibleItems.length}</span>
      </section>

      {error && <div className="message" role="alert">{error}</div>}
      {loading ? (
        <div className="empty">Загружаем галерею…</div>
      ) : visibleItems.length === 0 ? (
        <div className="empty">
          <span className="empty-symbol" aria-hidden="true">✦</span>
          <h2>{items.length === 0 ? "Здесь пока пусто" : "Нет публикаций в этой категории"}</h2>
          <p>{items.length === 0 ? "Загрузи первое фото или видео." : "Выбери другой фильтр."}</p>
          {items.length === 0 && <button className="primary-button" onClick={() => setUploadOpen(true)}>Добавить публикацию</button>}
        </div>
      ) : (
        <section className="gallery" aria-label="Публикации">
          {visibleItems.map((item) => (
            <button type="button" className="media-card" key={item.id} onClick={() => setSelected(item)} aria-label={`Открыть: ${item.title}`}>
              <div className="preview">
                {item.type === "image" ? (
                  <img src={item.url} alt="" loading="lazy" />
                ) : (
                  <>
                    <video src={`${item.url}#t=0.1`} preload="metadata" muted playsInline />
                    <span className="play-icon" aria-hidden="true">▶</span>
                  </>
                )}
              </div>
              <div className="card-info">
                <h2>{item.title}</h2>
                <span>{item.type === "image" ? "Фото" : "Видео"}</span>
              </div>
            </button>
          ))}
        </section>
      )}

      {uploadOpen && (
        <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) setUploadOpen(false); }}>
          <form className="modal" onSubmit={upload} role="dialog" aria-modal="true" aria-label="Новая публикация">
            <div className="modal-header">
              <h2>Новая публикация</h2>
              <button className="close-button" type="button" disabled={uploading} onClick={() => setUploadOpen(false)} aria-label="Закрыть">×</button>
            </div>
            <p className="modal-description">Добавь фото или видео, чтобы его увидели остальные.</p>
            <label className="field-label" htmlFor="title">Название</label>
            <input id="title" className="text-input" maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Название публикации" />
            <label className="field-label" htmlFor="file">Файл</label>
            <label className="file-area" htmlFor="file">
              <span className="upload-symbol" aria-hidden="true">↑</span>
              <strong>{file?.name ?? "Выбрать файл"}</strong>
              <span>JPG, PNG, GIF, WEBP, MP4 или WEBM</span>
              <small>Максимум 20 МБ</small>
              <input id="file" type="file" ref={fileInput} accept={ALLOWED_TYPES.join(",")} onChange={selectFile} required />
            </label>
            {uploadError && <div className="message" role="alert">{uploadError}</div>}
            <button className="primary-button submit-button" type="submit" disabled={!file || uploading}>{uploading ? "Загрузка…" : "Опубликовать"}</button>
          </form>
        </div>
      )}

      {selected && (
        <div className="overlay viewer-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
          <div className="viewer" role="dialog" aria-modal="true" aria-label={selected.title}>
            <button type="button" className="viewer-close" onClick={() => setSelected(null)} aria-label="Закрыть">×</button>
            {selected.type === "image" ? <img src={selected.url} alt={selected.title} /> : <video key={selected.id} src={selected.url} controls autoPlay playsInline />}
            <h2>{selected.title}</h2>
          </div>
        </div>
      )}
    </main>
  );
}
