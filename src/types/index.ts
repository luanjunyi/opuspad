export interface FileNode {
  name: string;
  kind: "file" | "directory";
  path: string;
  handle: FileSystemFileHandle | FileSystemDirectoryHandle | null;
  children?: FileNode[];
  childrenLoaded?: boolean;
}

export type LoadFileResult =
  | {
      kind: "text";
      path: string;
      content: string;
      editor: "markdown" | "text";
      warning?: string;
      canOpenInSourceMode?: boolean;
      canOpenInRichMode?: boolean;
    }
  | {
      kind: "error";
      path: string;
      reason: "binary" | "unsupported_encoding" | "permission_denied" | "read_failed";
      message: string;
    };

export interface ActiveFile {
  node: FileNode;
  state: LoadFileResult;
}

export interface FileSystemService {
  mountWorkspace(): Promise<FileSystemDirectoryHandle | null>;
  ensurePermission(
    handle: FileSystemFileHandle | FileSystemDirectoryHandle,
    mode: "read" | "readwrite"
  ): Promise<boolean>;
  createFile(
    dirHandle: FileSystemDirectoryHandle,
    currentPath: string,
    name: string
  ): Promise<FileNode>;
  readDirectory(
    dirHandle: FileSystemDirectoryHandle,
    currentPath?: string
  ): Promise<FileNode[]>;
  readEditableFile(fileHandle: FileSystemFileHandle, path: string): Promise<LoadFileResult>;
  writeFile(fileHandle: FileSystemFileHandle, content: string): Promise<void>;
}
