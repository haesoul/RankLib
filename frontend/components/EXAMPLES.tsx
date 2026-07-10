// /**
//  * ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ API СИНХРОНИЗАЦИИ
//  * React Native + TypeScript
//  */

// import React, { useState } from "react";
// import { View, Text, Button, ActivityIndicator, Alert } from "react-native";
// import { useRealm } from "@realm/react";
// import {
//   SyncAPI,
//   useImportToDjango,
//   useExportFromDjango,
//   useFullSync,
//   useSyncStatus,
//   AuthManager,
// } from "@/API";

// // ============================================
// // ПРИМЕР 1: Компонент загрузки данных с сервера
// // ============================================

// export function DownloadFromServerScreen() {
//   const realm = useRealm();
//   const { exportData, loading, error, progress } = useExportFromDjango();
//   const [filesDownloaded, setFilesDownloaded] = useState(0);

//   const handleDownload = async () => {
//     try {
//       // Скачиваем данные с сервера
//       const response = await exportData({
//         include_media: true,
//         include_notes: true,
//         include_proofs: true,
//         download_files: true,
//       });

//       if (response.success) {
//         Alert.alert(
//           "Success",
//           `Downloaded ${Object.keys(response.data).length} tables successfully!`
//         );

//         // Теперь можно импортировать в Realm
//         // (здесь должна быть ваша логика импорта в Realm)
//       }
//     } catch (err) {
//       Alert.alert("Error", "Failed to download data from server");
//       console.error(err);
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>
//         Download Data from Server
//       </Text>

//       {loading && (
//         <View style={{ marginBottom: 20 }}>
//           <ActivityIndicator size="large" />
//           <Text style={{ textAlign: "center", marginTop: 10 }}>
//             Downloading... {progress.toFixed(0)}%
//           </Text>
//         </View>
//       )}

//       {error && (
//         <Text style={{ color: "red", marginBottom: 20 }}>
//           Error: {error.message}
//         </Text>
//       )}

//       <Button
//         title="Download from Server"
//         onPress={handleDownload}
//         disabled={loading}
//       />
//     </View>
//   );
// }

// // ============================================
// // ПРИМЕР 2: Компонент отправки данных на сервер
// // ============================================

// export function UploadToServerScreen() {
//   const realm = useRealm();
//   const { importData, loading, error, progress, stage } = useImportToDjango();

//   const handleUpload = async () => {
//     try {
//       // Отправляем данные на сервер
//       const response = await importData(realm, {
//         merge: true, // Объединить с существующими данными
//         includeMedia: true,
//         includeNotes: true,
//         includeProofs: true,
//       });

//       if (response.success) {
//         Alert.alert(
//           "Success",
//           `Uploaded successfully!\n` +
//             `Created: ${response.stats?.created_items}\n` +
//             `Updated: ${response.stats?.updated_items}\n` +
//             `Files uploaded: ${response.stats?.files_uploaded}`
//         );
//       }
//     } catch (err) {
//       Alert.alert("Error", "Failed to upload data to server");
//       console.error(err);
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>
//         Upload Data to Server
//       </Text>

//       {loading && (
//         <View style={{ marginBottom: 20 }}>
//           <ActivityIndicator size="large" />
//           <Text style={{ textAlign: "center", marginTop: 10 }}>
//             {stage}
//           </Text>
//           <Text style={{ textAlign: "center", marginTop: 5 }}>
//             {progress.toFixed(0)}%
//           </Text>
//         </View>
//       )}

//       {error && (
//         <Text style={{ color: "red", marginBottom: 20 }}>
//           Error: {error.message}
//         </Text>
//       )}

//       <Button
//         title="Upload to Server"
//         onPress={handleUpload}
//         disabled={loading}
//       />
//     </View>
//   );
// }

// // ============================================
// // ПРИМЕР 3: Полная двусторонняя синхронизация
// // ============================================

// export function FullSyncScreen() {
//   const realm = useRealm();
//   const {
//     sync,
//     loading,
//     error,
//     progress,
//     stage,
//     uploadResult,
//     downloadResult,
//     cancel,
//   } = useFullSync();

//   const handleSync = async (direction: "upload" | "download" | "both") => {
//     try {
//       await sync(realm, direction);
//       Alert.alert("Success", "Sync completed successfully!");
//     } catch (err) {
//       if (err.name !== "AbortError") {
//         Alert.alert("Error", "Sync failed");
//       }
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>Synchronization</Text>

//       {loading && (
//         <View style={{ marginBottom: 20 }}>
//           <ActivityIndicator size="large" />
//           <Text style={{ textAlign: "center", marginTop: 10 }}>{stage}</Text>
//           <Text style={{ textAlign: "center", marginTop: 5 }}>
//             {progress.toFixed(0)}%
//           </Text>
//         </View>
//       )}

//       {error && (
//         <Text style={{ color: "red", marginBottom: 20 }}>
//           Error: {error.message}
//         </Text>
//       )}

//       {uploadResult && (
//         <View style={{ marginBottom: 20, padding: 10, backgroundColor: "#e8f5e9" }}>
//           <Text style={{ fontWeight: "bold" }}>Upload Result:</Text>
//           <Text>Created: {uploadResult.stats?.created_items}</Text>
//           <Text>Updated: {uploadResult.stats?.updated_items}</Text>
//           <Text>Files: {uploadResult.stats?.files_uploaded}</Text>
//         </View>
//       )}

//       {downloadResult && (
//         <View style={{ marginBottom: 20, padding: 10, backgroundColor: "#e3f2fd" }}>
//           <Text style={{ fontWeight: "bold" }}>Download Result:</Text>
//           <Text>Data downloaded successfully</Text>
//         </View>
//       )}

//       <View style={{ gap: 10 }}>
//         <Button
//           title="Upload to Server"
//           onPress={() => handleSync("upload")}
//           disabled={loading}
//         />
//         <Button
//           title="Download from Server"
//           onPress={() => handleSync("download")}
//           disabled={loading}
//         />
//         <Button
//           title="Full Sync (Both Ways)"
//           onPress={() => handleSync("both")}
//           disabled={loading}
//         />
//         {loading && (
//           <Button title="Cancel" onPress={cancel} color="red" />
//         )}
//       </View>
//     </View>
//   );
// }

// // ============================================
// // ПРИМЕР 4: Статус синхронизации
// // ============================================

// export function SyncStatusScreen() {
//   const { getStatus, loading, error, status, refetch } = useSyncStatus();
//   const [autoRefresh, setAutoRefresh] = useState(false);

//   React.useEffect(() => {
//     getStatus();

//     if (autoRefresh) {
//       const interval = setInterval(refetch, 30000); // Каждые 30 секунд
//       return () => clearInterval(interval);
//     }
//   }, [autoRefresh]);

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>Sync Status</Text>

//       {loading && <ActivityIndicator size="large" />}

//       {error && (
//         <Text style={{ color: "red", marginBottom: 20 }}>
//           Error: {error.message}
//         </Text>
//       )}

//       {status && (
//         <View>
//           <View style={{ marginBottom: 20 }}>
//             <Text style={{ fontWeight: "bold" }}>Status:</Text>
//             <Text>
//               Last Sync:{" "}
//               {status.status.last_sync_at
//                 ? new Date(status.status.last_sync_at).toLocaleString()
//                 : "Never"}
//             </Text>
//             <Text>
//               Enabled: {status.status.sync_enabled ? "Yes" : "No"}
//             </Text>
//             <Text>Pending Changes: {status.status.pending_changes || 0}</Text>
//           </View>

//           <View style={{ marginBottom: 20 }}>
//             <Text style={{ fontWeight: "bold" }}>Statistics:</Text>
//             <Text>Classes: {status.statistics.total_classes}</Text>
//             <Text>Objects: {status.statistics.total_objects}</Text>
//             <Text>Categories: {status.statistics.total_categories}</Text>
//             <Text>Ratings: {status.statistics.total_ratings}</Text>
//           </View>
//         </View>
//       )}

//       <View style={{ gap: 10 }}>
//         <Button title="Refresh" onPress={refetch} disabled={loading} />
//         <Button
//           title={autoRefresh ? "Stop Auto Refresh" : "Start Auto Refresh"}
//           onPress={() => setAutoRefresh(!autoRefresh)}
//         />
//       </View>
//     </View>
//   );
// }

// // ============================================
// // ПРИМЕР 5: Использование без хуков (прямой вызов API)
// // ============================================

// export function DirectAPIUsageExample() {
//   const realm = useRealm();
//   const [status, setStatus] = useState<string>("Ready");

//   const handleDirectSync = async () => {
//     try {
//       setStatus("Uploading...");

//       // Прямой вызов API без хуков
//       const response = await SyncAPI.syncToServer(realm, {
//         merge: true,
//         includeMedia: true,
//         includeNotes: true,
//         includeProofs: true,
//         onProgress: (current, total, stage) => {
//           setStatus(`${stage} (${current}/${total})`);
//         },
//       });

//       if (response.success) {
//         setStatus("Complete!");
//         Alert.alert("Success", "Data uploaded successfully!");
//       }
//     } catch (err) {
//       setStatus("Error");
//       console.error(err);
//     }
//   };

//   const handleDirectDownload = async () => {
//     try {
//       setStatus("Downloading...");

//       const response = await SyncAPI.exportFromDjango({
//         include_media: true,
//         include_notes: true,
//         include_proofs: true,
//         download_files: true,
//       });

//       if (response.success) {
//         setStatus("Complete!");
//         Alert.alert("Success", "Data downloaded successfully!");
//       }
//     } catch (err) {
//       setStatus("Error");
//       console.error(err);
//     }
//   };

//   const handleGetStatus = async () => {
//     try {
//       const response = await SyncAPI.getSyncStatus();
//       Alert.alert(
//         "Sync Status",
//         `Last Sync: ${response.status.last_sync_at || "Never"}\n` +
//           `Total Objects: ${response.statistics.total_objects}`
//       );
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   const handleValidateData = async () => {
//     try {
//       setStatus("Preparing data...");

//       const data = await SyncAPI.prepareDataForImport(realm, {
//         includeMedia: false,
//         includeNotes: false,
//         includeProofs: false,
//       });

//       setStatus("Validating...");

//       const report = await SyncAPI.validateData(data);

//       Alert.alert(
//         "Validation Result",
//         `Valid: ${report.is_valid}\n` +
//           `Total Records: ${report.total_records}\n` +
//           `Valid Records: ${report.valid_records}\n` +
//           `Errors: ${report.errors?.length || 0}`
//       );

//       setStatus("Ready");
//     } catch (err) {
//       setStatus("Error");
//       console.error(err);
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>Direct API Usage</Text>

//       <Text style={{ marginBottom: 20 }}>Status: {status}</Text>

//       <View style={{ gap: 10 }}>
//         <Button title="Upload Data" onPress={handleDirectSync} />
//         <Button title="Download Data" onPress={handleDirectDownload} />
//         <Button title="Get Status" onPress={handleGetStatus} />
//         <Button title="Validate Data" onPress={handleValidateData} />
//       </View>
//     </View>
//   );
// }

// // ============================================
// // ПРИМЕР 6: Массовый экспорт выбранных объектов
// // ============================================

// export function BulkExportExample() {
//   const [selectedObjects, setSelectedObjects] = useState<string[]>([]);
//   const [loading, setLoading] = useState(false);

//   const handleBulkExport = async () => {
//     try {
//       setLoading(true);

//       const response = await SyncAPI.bulkExport({
//         object_ids: selectedObjects,
//         with_relationships: true,
//         download_files: true,
//       });

//       if (response.success) {
//         Alert.alert(
//           "Success",
//           `Exported ${Object.keys(response.data).length} tables`
//         );
//       }
//     } catch (err) {
//       Alert.alert("Error", "Failed to export data");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>Bulk Export</Text>

//       {/* Здесь должен быть список объектов для выбора */}

//       <Button
//         title={`Export ${selectedObjects.length} objects`}
//         onPress={handleBulkExport}
//         disabled={loading || selectedObjects.length === 0}
//       />
//     </View>
//   );
// }

// // ============================================
// // ПРИМЕР 7: Управление токеном авторизации
// // ============================================

// export function AuthExample() {
//   const [token, setToken] = useState<string | null>(null);

//   React.useEffect(() => {
//     // Загружаем токен при монтировании
//     AuthManager.getToken().then(setToken);
//   }, []);

//   const handleLogin = async (userToken: string) => {
//     // Сохраняем токен
//     await AuthManager.setToken(userToken);
//     setToken(userToken);
//   };

//   const handleLogout = async () => {
//     // Удаляем токен
//     await AuthManager.clearToken();
//     setToken(null);
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>Authentication</Text>

//       {token ? (
//         <View>
//           <Text>Logged in</Text>
//           <Text style={{ fontSize: 10, marginVertical: 10 }}>
//             Token: {token.substring(0, 20)}...
//           </Text>
//           <Button title="Logout" onPress={handleLogout} />
//         </View>
//       ) : (
//         <View>
//           <Text>Not logged in</Text>
//           <Button
//             title="Login"
//             onPress={() => handleLogin("your_auth_token_here")}
//           />
//         </View>
//       )}
//     </View>
//   );
// }

// // ============================================
// // ПРИМЕР 8: Контрольные точки
// // ============================================

// export function CheckpointExample() {
//   const [checkpoint, setCheckpoint] = useState<any>(null);
//   const [loading, setLoading] = useState(false);

//   const handleGetCheckpoint = async () => {
//     try {
//       setLoading(true);
//       const response = await SyncAPI.getCheckpoint();
//       setCheckpoint(response);
//     } catch (err) {
//       Alert.alert("Error", "Failed to get checkpoint");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleCreateCheckpoint = async () => {
//     try {
//       setLoading(true);
//       const response = await SyncAPI.createCheckpoint();
//       setCheckpoint(response);
//       Alert.alert("Success", "Checkpoint created successfully!");
//     } catch (err) {
//       Alert.alert("Error", "Failed to create checkpoint");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <View style={{ padding: 20 }}>
//       <Text style={{ fontSize: 20, marginBottom: 20 }}>Checkpoints</Text>

//       {checkpoint && (
//         <View style={{ marginBottom: 20, padding: 10, backgroundColor: "#f5f5f5" }}>
//           <Text>Workspace ID: {checkpoint.workspace_id}</Text>
//           <Text>Total Classes: {checkpoint.total_classes}</Text>
//           <Text>Total Objects: {checkpoint.total_objects}</Text>
//           <Text>Total Categories: {checkpoint.total_categories}</Text>
//           <Text>Total Ratings: {checkpoint.total_ratings}</Text>
//           <Text>
//             Created:{" "}
//             {checkpoint.created_at
//               ? new Date(checkpoint.created_at).toLocaleString()
//               : "N/A"}
//           </Text>
//         </View>
//       )}

//       <View style={{ gap: 10 }}>
//         <Button
//           title="Get Last Checkpoint"
//           onPress={handleGetCheckpoint}
//           disabled={loading}
//         />
//         <Button
//           title="Create New Checkpoint"
//           onPress={handleCreateCheckpoint}
//           disabled={loading}
//         />
//       </View>
//     </View>
//   );
// }
