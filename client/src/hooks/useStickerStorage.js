// src/hooks/useStickerStorage.js
// Зберігає стікери у localStorage у вигляді base64 — без серверу

const STORAGE_KEY = "sticker_packs_v1";

/** Читає всі пакети з localStorage */
export function readPacks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Записує масив пакетів у localStorage */
function writePacks(packs) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(packs));
}

/** Створити новий пакет. Повертає пакет. */
export function createPack(name) {
  const packs = readPacks();
  const pack = {
    id: `pack_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name: name.trim(),
    stickers: [],
    createdAt: Date.now(),
  };
  writePacks([pack, ...packs]);
  return pack;
}

/** Видалити пакет за id */
export function deletePack(packId) {
  const packs = readPacks().filter((p) => p.id !== packId);
  writePacks(packs);
}

/**
 * Конвертує File у base64 dataURL і додає стікер до пакету.
 * Повертає Promise<sticker>
 */
export function addStickerToPack(packId, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const sticker = {
        id: `stk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        packId,
        dataUrl,    // base64 — зберігається локально
        emoji: "😊",
        name: file.name,
        addedAt: Date.now(),
      };

      const packs = readPacks();
      const updated = packs.map((p) =>
        p.id === packId
          ? { ...p, stickers: [...p.stickers, sticker] }
          : p
      );
      writePacks(updated);
      resolve(sticker);
    };
    reader.onerror = () => reject(new Error("Не вдалося прочитати файл"));
    reader.readAsDataURL(file);
  });
}

/** Видалити стікер за id */
export function deleteSticker(stickerId) {
  const packs = readPacks().map((p) => ({
    ...p,
    stickers: p.stickers.filter((s) => s.id !== stickerId),
  }));
  writePacks(packs);
}

/** Знайти стікер за id (для відображення в чаті) */
export function findStickerById(stickerId) {
  for (const pack of readPacks()) {
    const found = pack.stickers.find((s) => s.id === stickerId);
    if (found) return found;
  }
  return null;
}

/**
 * Додати один стікер (з чату) до існуючого або нового пакету.
 * @param {string} packId   — id існуючого пакету (або null для нового)
 * @param {string} packName — назва нового пакету (якщо packId === null)
 * @param {string} dataUrl  — base64 зображення стікера
 * @returns {object} { pack, sticker }
 */
export function addStickerFromChat(packId, packName, dataUrl) {
  let packs = readPacks();

  // Якщо пакет не вказано — перевіряємо чи є вже такий з таким іменем
  if (!packId) {
    const existing = packs.find((p) => p.name === packName);
    if (existing) {
      packId = existing.id;
    } else {
      const newPack = {
        id: `pack_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: packName,
        stickers: [],
        createdAt: Date.now(),
      };
      packs = [newPack, ...packs];
      packId = newPack.id;
    }
  }

  const sticker = {
    id: `stk_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    packId,
    dataUrl,
    emoji: "😊",
    name: "sticker",
    addedAt: Date.now(),
  };

  const updated = packs.map((p) =>
    p.id === packId
      ? { ...p, stickers: [...p.stickers, sticker] }
      : p
  );
  writePacks(updated);

  return { pack: updated.find((p) => p.id === packId), sticker };
}

/**
 * Додати цілий пак зі списку стікерів (з чату).
 * stickers — масив { dataUrl, emoji, name }
 */
export function addPackFromChat(packName, stickers) {
  let packs = readPacks();

  // Якщо пакет з таким ім'ям вже є — оновлюємо його
  const existingIdx = packs.findIndex((p) => p.name === packName);
  const packId = existingIdx >= 0
    ? packs[existingIdx].id
    : `pack_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const newStickers = stickers.map((s, i) => ({
    id: `stk_${Date.now()}_${i}_${Math.random().toString(36).slice(2)}`,
    packId,
    dataUrl: s.dataUrl,
    emoji: s.emoji || "😊",
    name: s.name || `sticker_${i}`,
    addedAt: Date.now(),
  }));

  if (existingIdx >= 0) {
    // Додаємо тільки ті, яких ще немає (по dataUrl)
    const existingUrls = new Set(packs[existingIdx].stickers.map((s) => s.dataUrl));
    const toAdd = newStickers.filter((s) => !existingUrls.has(s.dataUrl));
    packs[existingIdx] = {
      ...packs[existingIdx],
      stickers: [...packs[existingIdx].stickers, ...toAdd],
    };
  } else {
    packs = [
      { id: packId, name: packName, stickers: newStickers, createdAt: Date.now() },
      ...packs,
    ];
  }

  writePacks(packs);
  return packs.find((p) => p.id === packId);
}
