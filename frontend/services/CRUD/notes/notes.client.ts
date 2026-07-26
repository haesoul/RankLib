import { GradeObject, Note } from "@/realm/models";
import { deleteFiles } from "@/utils/deleteFiles";
import { logStorageTree } from "@/utils/logStorage";
import { MediaPaths } from "@/utils/mediaPaths";
import * as FileSystem from "expo-file-system";
import Realm from "realm";


export const createNote = async (
  realm: Realm,
  gradeObject: GradeObject,
  text: string,
  photo?: string | null
): Promise<void> => {
  let destPath: string | undefined;

  if (photo) {
    const notesDir = MediaPaths.notesDir(gradeObject.class_of_object, gradeObject);
    const fileName = `note_${Date.now()}.jpg`;
    const proposedDest = MediaPaths.noteFile(gradeObject.class_of_object, gradeObject, fileName);
    
    try {
      await FileSystem.makeDirectoryAsync(notesDir, { intermediates: true });
      await FileSystem.copyAsync({ from: photo, to: proposedDest });
      await deleteFiles(photo);
      destPath = proposedDest;
    } catch (err) {
      console.error(`Ошибка копирования фото для заметки:`, err);
      await deleteFiles(proposedDest);
    }
  }

    try {
    realm.write(() => {
        gradeObject.notes.push({
        text,
        photoUri: destPath,
        createdAt: new Date(),
        pinned: false,
        } as unknown as Note);
    });
    } catch (err) {
    console.error("Ошибка при создании заметки:", err);
    throw err;
    }

  await logStorageTree();
};

export interface UpdateNoteProps {
  text?: string;
  photo?: string | null;
  pinned?: boolean;
}

export const updateNote = async (
  realm: Realm,
  gradeObject: GradeObject,
  noteToUpdate: Note,
  updates: UpdateNoteProps
) => {
  if (!noteToUpdate || !updates || Object.keys(updates).length === 0) return;

  const hasNewPhoto = Boolean(
    updates.photo &&
    typeof updates.photo === "string" &&
    !updates.photo.startsWith(FileSystem.documentDirectory || "")
  );
  
  const isPhotoRemoved = updates.photo === null;
  let destPath: string | null | undefined = undefined;

  try {
    if (hasNewPhoto && typeof updates.photo === "string") {
      const notesDir = MediaPaths.notesDir(gradeObject.class_of_object, gradeObject);
      await FileSystem.makeDirectoryAsync(notesDir, { intermediates: true });

      const oldPath = noteToUpdate.photoUri;
      const fileName = `note_${Date.now()}.jpg`;
      destPath = MediaPaths.noteFile(gradeObject.class_of_object, gradeObject, fileName);

      await FileSystem.copyAsync({ from: updates.photo, to: destPath });
      await deleteFiles(updates.photo);

      if (oldPath) {
        const cleanOldPath = oldPath.split("?")[0];
        if (cleanOldPath !== destPath) {
          await deleteFiles(cleanOldPath);
        }
      }
    } else if (isPhotoRemoved) {
      if (noteToUpdate.photoUri) {
        await deleteFiles(noteToUpdate.photoUri.split("?")[0]);
      }
      destPath = null;
    }

    realm.write(() => {
      if (updates.text !== undefined) noteToUpdate.text = updates.text;
      if (updates.pinned !== undefined) noteToUpdate.pinned = updates.pinned;
      
      if (destPath !== undefined) {
        noteToUpdate.photoUri = destPath === null ? undefined : destPath;
      }
    });
  } catch (error) {
    console.error("Ошибка при обновлении Note:", error);
  }
  
  await logStorageTree();
};


export async function deleteNote(
  realm: Realm | undefined | null,
  target: Note | Note[] | null | undefined
): Promise<boolean> {
  if (!realm || !target) return false;

  const items = (Array.isArray(target) ? target : [target]).filter(
    (note): note is Note => Boolean(note && note.isValid())
  );

  if (items.length === 0) return false;

  try {
    const filesToDelete = items
      .map((note) => note.photoUri?.split("?")[0])
      .filter((uri): uri is string => Boolean(uri));

    realm.write(() => {
      for (const note of items) {
        realm.delete(note);
      }
    });

    await deleteFiles(filesToDelete);

    return true;
  } catch (e) {
    console.error("deleteNote error:", e);
    return false;
  } finally {
    await logStorageTree();
  }
}