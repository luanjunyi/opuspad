import { BrowserFileSystemService } from './fileSystem';
import { mockFileSystemService } from './mockFileSystem';

export function getFileSystemService() {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('fs') === 'mock') {
    return mockFileSystemService;
  }
  return BrowserFileSystemService;
}
