import * as FileSystem from 'expo-file-system';

export async function logStorageTree() {
  console.log("=== 📁 СКЛАД ФАЙЛОВ (DocumentDirectory) ===");
  await printDir(FileSystem.documentDirectory);

  console.log("\n=== 🧹 КЭШ (CacheDirectory) ===");
  await printDir(FileSystem.cacheDirectory);
}

async function printDir(dirUri?: string | null, indent = "") {
  if (!dirUri) return;

  try {
    const items = await FileSystem.readDirectoryAsync(dirUri);

    for (const item of items) {
      const itemUri = dirUri + item + "/";
      const info = await FileSystem.getInfoAsync(dirUri + item);

      if (!info.exists) {
        continue; 
      }

      if (info.isDirectory) {
        console.log(`${indent}📁 ${dirUri}${item}/`);
        await printDir(itemUri, indent + "  "); 
      } else {
        const sizeKb = (info.size / 1024).toFixed(1);
        console.log(`${indent}📄 ${dirUri}${item} (${sizeKb} KB)`);
      }
    }
  } catch (e) {
    console.log(`${indent}❌ Не удалось прочитать: ${dirUri}`);
  }
}