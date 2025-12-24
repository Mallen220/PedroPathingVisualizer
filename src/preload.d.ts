interface ElectronAPI {
  getDirectory: () => Promise<string>;
  listFiles: (directory: string) => Promise<{ name: string }[]>;
  readFile: (filePath: string) => Promise<string>;
  getSavedDirectory: () => Promise<string | null>;
  setDirectory: () => Promise<string | null>;
}

interface Window {
  electronAPI: ElectronAPI;
}
