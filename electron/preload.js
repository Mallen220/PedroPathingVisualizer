/*
 * Copyright 2026 Matthew Allen
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  // File system operations
  getAppDataPath: () => ipcRenderer.invoke("app:get-app-data-path"),
  getDirectory: () => ipcRenderer.invoke("file:get-directory"),
  setDirectory: () => ipcRenderer.invoke("file:set-directory"),
  listFiles: (directory) => ipcRenderer.invoke("file:list", directory),
  readFile: (filePath) => ipcRenderer.invoke("file:read", filePath),
  writeFile: (filePath, content) =>
    ipcRenderer.invoke("file:write", filePath, content),
  deleteFile: (filePath) => ipcRenderer.invoke("file:delete", filePath),
  fileExists: (filePath) => ipcRenderer.invoke("file:exists", filePath),

  // Directory settings operations
  getDirectorySettings: () => ipcRenderer.invoke("directory:get-settings"),
  saveDirectorySettings: (settings) =>
    ipcRenderer.invoke("directory:save-settings", settings),
  getSavedDirectory: () => ipcRenderer.invoke("directory:get-saved-directory"),

  // Enhanced file operations
  createDirectory: (dirPath) =>
    ipcRenderer.invoke("file:create-directory", dirPath),
  getDirectoryStats: (dirPath) =>
    ipcRenderer.invoke("file:get-directory-stats", dirPath),

  // Rename operation
  renameFile: (oldPath, newPath) =>
    ipcRenderer.invoke("file:rename", oldPath, newPath),

  // Show native save dialog. Options follow Electron's showSaveDialog options
  showSaveDialog: (options) =>
    ipcRenderer.invoke("file:show-save-dialog", options),

  // Write binary content encoded as base64 to disk
  writeFileBase64: (filePath, base64Content) =>
    ipcRenderer.invoke("file:write-base64", filePath, base64Content),

  // Export .pp convenience wrapper
  exportPP: (content, defaultName) =>
    ipcRenderer.invoke("export:pp", { content, defaultName }),

  // File Copy
  copyFile: (srcPath, destPath) =>
    ipcRenderer.invoke("file:copy", srcPath, destPath),

  // Renderer ready signal
  rendererReady: () => ipcRenderer.invoke("renderer-ready"),

  // Open file path listener
  onOpenFilePath: (callback) =>
    ipcRenderer.on("open-file-path", (_event, filePath) => callback(filePath)),

  // Menu action listener
  onMenuAction: (callback) =>
    ipcRenderer.on("menu-action", (_event, action) => callback(action)),

  // Get app version
  getAppVersion: () => ipcRenderer.invoke("app:get-version"),
});
