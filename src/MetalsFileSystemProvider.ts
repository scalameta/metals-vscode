import { ServerCommands } from "./interfaces/ServerCommands";
import {
  EventEmitter,
  FileSystemProvider,
  Uri,
  Disposable,
  Event,
  FileChangeEvent,
  FileStat,
  FileType,
  FileSystemError,
  FileChangeType,
} from "vscode";
import { ExecuteCommandRequest } from "vscode-languageclient/node";
import { LanguageClient } from "vscode-languageclient/node";

export interface FSReadDirectoryResponse {
  name: string;
  isFile: boolean;
}

export interface FSReadDirectoriesResponse {
  name: string;
  directories?: FSReadDirectoryResponse[];
  error?: string;
}

export interface FSReadFileResponse {
  name: string;
  value?: string;
  error?: string;
}

export interface FSStatResponse {
  name: string;
  isFile?: boolean;
  error?: string;
}

export class GenericFileStat implements FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;

  constructor(isFile: boolean) {
    this.type = isFile ? FileType.File : FileType.Directory;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = 0;
  }
}

export default class MetalsFileSystemProvider implements FileSystemProvider {
  readonly client: LanguageClient;
  readonly exclusions: string[];

  constructor(client: LanguageClient, rootUri: Uri) {
    // automatically reject files/directories that vscode checks for but will never appear on metalfs
    this.exclusions = [".vscode", ".git", ".devcontainer"].map(
      (path) => `${rootUri.path}/${path}`,
    );
    this.client = client;
  }

  private checkUri(uri: Uri) {
    const path = uri.path;
    if (
      this.exclusions.some(
        (exclusion) => path === exclusion || path.startsWith(exclusion + "/"),
      )
    ) {
      throw FileSystemError.FileNotFound(uri);
    }
  }

  stat(uri: Uri): FileStat | Thenable<FileStat> {
    this.checkUri(uri);

    return this.client
      .sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.FileSystemStat,
        arguments: [uri.toString(true)],
      })
      .then((result: FSStatResponse) => {
        const { isFile, error, name } = result;
        if (isFile !== undefined) {
          return new GenericFileStat(isFile);
        } else if (error !== undefined) {
          throw FileSystemError.FileNotFound(error);
        } else {
          throw FileSystemError.FileNotFound(name);
        }
      });
  }

  readDirectory(
    uri: Uri,
  ): [string, FileType][] | Thenable<[string, FileType][]> {
    this.checkUri(uri);

    return this.client
      .sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.FileSystemReadDirectory,
        arguments: [uri.toString(true)],
      })
      .then((result: FSReadDirectoriesResponse) => {
        const { directories, error, name } = result;
        if (directories) {
          return directories.map(this.toReadDirResult);
        } else if (error !== undefined) {
          throw FileSystemError.FileNotFound(error);
        } else {
          throw FileSystemError.FileNotFound(name);
        }
      });
  }

  readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
    this.checkUri(uri);

    return this.client
      .sendRequest(ExecuteCommandRequest.type, {
        command: ServerCommands.FileSystemReadFile,
        arguments: [uri.toString(true)],
      })
      .then((result: FSReadFileResponse) => {
        const { value, error, name } = result;
        if (value !== undefined) {
          return Buffer.from(value);
        } else if (error !== undefined) {
          throw FileSystemError.FileNotFound(error);
        } else {
          throw FileSystemError.FileNotFound(name);
        }
      });
  }

  reinitialiseURI(uri: Uri) {
    this._fireSoon({ type: FileChangeType.Changed, uri: uri });
  }

  private toReadDirResult(
    response: FSReadDirectoryResponse,
  ): [string, FileType] {
    return [
      response.name,
      response.isFile ? FileType.File : FileType.Directory,
    ];
  }

  private _emitter = new EventEmitter<FileChangeEvent[]>();
  private _bufferedEvents: FileChangeEvent[] = [];
  private _fireSoonHandle?: ReturnType<typeof setTimeout>;

  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

  private _fireSoon(...events: FileChangeEvent[]): void {
    this._bufferedEvents.push(...events);

    if (this._fireSoonHandle) {
      clearTimeout(this._fireSoonHandle);
    }

    this._fireSoonHandle = setTimeout(() => {
      this._emitter.fire(this._bufferedEvents);
      this._bufferedEvents.length = 0;
    }, 5);
  }

  watch(
    _uri: Uri,
    _options: { recursive: boolean; excludes: string[] },
  ): Disposable {
    return new Disposable(() => {
      // do nothing
    });
  }

  createDirectory(uri: Uri): void | Thenable<void> {
    throw FileSystemError.NoPermissions(uri);
  }

  delete(uri: Uri, options: { recursive: boolean }): void | Thenable<void> {
    void options;
    throw FileSystemError.NoPermissions(uri);
  }

  rename(
    oldUri: Uri,
    newUri: Uri,
    options: { overwrite: boolean },
  ): void | Thenable<void> {
    void newUri;
    void options;
    throw FileSystemError.NoPermissions(oldUri);
  }

  writeFile(
    uri: Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): void | Thenable<void> {
    void content;
    void options;
    throw FileSystemError.NoPermissions(uri);
  }
}
