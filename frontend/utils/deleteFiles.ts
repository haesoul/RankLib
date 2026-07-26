// import * as FileSystem from 'expo-file-system';

// export async function deleteFiles(paths?: string | Array<string | null | undefined> | null) {
//     if (!paths) return;

//     const uris = Array.isArray(paths) ? paths : [paths];

//     const validUris = uris.filter((p): p is string => Boolean(p?.trim()));
//     if (validUris.length === 0) return;

//     const results = await Promise.allSettled(
//         validUris.map(path => FileSystem.deleteAsync(path, { idempotent: true }))
//     );

//     results.forEach((result, index) => {
//         if (result.status === 'rejected') {
//             console.error(
//                 `Опять кривые пути подсовываешь? Не удалось удалить: ${validUris[index]}`, 
//                 result.reason
//             );
//         }
//     });
// }

import * as FileSystem from 'expo-file-system';

async function deleteRecursively(uri: string): Promise<void> {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return;

    if (info.isDirectory) {
        const contents = await FileSystem.readDirectoryAsync(uri);
        for (const name of contents) {
            await deleteRecursively(`${uri}${uri.endsWith('/') ? '' : '/'}${name}`);
        }
    }

    await FileSystem.deleteAsync(uri, { idempotent: true });
}

export async function deleteFiles(paths?: string | Array<string | null | undefined> | null) {
    if (!paths) return;

    const uris = Array.isArray(paths) ? paths : [paths];

    const validUris = uris.filter((p): p is string => Boolean(p?.trim()));
    if (validUris.length === 0) return;

    const results = await Promise.allSettled(
        validUris.map(path => deleteRecursively(path))
    );

    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            console.error(
                `Опять кривые пути подсовываешь? Не удалось удалить: ${validUris[index]}`, 
                result.reason
            );
        }
    });
}