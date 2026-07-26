import { GradeObject, MediaItem } from "@/realm/models";
import { deleteFiles } from "@/utils/deleteFiles";
import { logStorageTree } from "@/utils/logStorage";
import { MediaPaths } from "@/utils/mediaPaths";
import * as FileSystem from "expo-file-system";
import Realm from "realm";

const VIDEO_EXTENSIONS = ["mp4", "mov", "mkv", "webm", "m4v"];

export interface MediaCreateItem {
  uri: string;     
  mediaType?: string;   
  mimeType?: string;
  caption?: string;
}

interface CreateMediaArgs {
  realm: Realm;
  obj: GradeObject;
  items: MediaCreateItem[];
}

export const createMedia = async ({ realm, obj, items }: CreateMediaArgs): Promise<number> => {
  const validItems = items.filter((i) => i.uri?.trim());
  if (!validItems.length) return 0;

  const galleryDir = MediaPaths.galleryDir(obj.class_of_object, obj._id);

  const prepared = await Promise.all(
    validItems.map(async (item) => {
      const ext = (item.uri.split(".").pop()?.split("?")[0] || "").toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext || "jpg"}`;
      const destPath = MediaPaths.galleryFile(obj.class_of_object, obj._id, fileName);

      try {
        await FileSystem.makeDirectoryAsync(galleryDir, { intermediates: true });
        await FileSystem.moveAsync({ from: item.uri, to: destPath });

        return {
          uri: destPath,
          mediaType: item.mediaType ?? (VIDEO_EXTENSIONS.includes(ext) ? "video" : "photo"),
          mimeType: item.mimeType,
          caption: item.caption,
          thumbnailUri: destPath,
          createdAt: new Date(),
        };
      } catch (err) {
        console.error(`Ошибка сохранения медиа ${item.uri}:`, err);
        await deleteFiles(destPath);
        return null;
      }
    })
  );

  const validPrepared = prepared.filter((p): p is NonNullable<typeof p> => p !== null);
  if (!validPrepared.length) return 0;

  realm.write(() => {
    validPrepared.forEach((item) => {
      obj.media.push(item as unknown as MediaItem);
    });
  });

  await logStorageTree();
  return validPrepared.length;
};

export async function deleteMedia(
  realm: Realm | undefined | null,
  obj: GradeObject | null | undefined,
  target: MediaItem | MediaItem[] | null | undefined
): Promise<boolean> {
  if (!realm || !obj || !target) return false;

  const items = Array.isArray(target) ? target : [target];
  if (!items.length) return false;

  const urisToDelete = items.map((m) => m.uri).filter((u): u is string => Boolean(u));

  try {
    realm.write(() => {
      for (const item of items) {
        try {
          realm.delete(item);
          continue;
        } catch {}
        const idx = obj.media.indexOf(item);
        if (idx >= 0) obj.media.splice(idx, 1);
      }
    });

    await deleteFiles(urisToDelete);
    return true;
  } catch (e) {
    console.error("deleteMedia error:", e);
    return false;
  } finally {
    await logStorageTree();
  }
}