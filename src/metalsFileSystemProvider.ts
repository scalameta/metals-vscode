//import { ServerCommands } from "metals-languageclient";
import {
  EventEmitter,
  //ProviderResult,
  FileSystemProvider,
  Uri,
  Disposable,
  Event,
  FileChangeEvent,
  FileStat,
  FileType,
  OutputChannel,
} from "vscode";
import { ExecuteCommandRequest } from "vscode-languageclient";
import { LanguageClient } from "vscode-languageclient/node";


export interface FSReadDirectoryResponse {
  name: string,
  isFile: boolean,
  error?: string
}

export interface FSReadFileResponse {
  value: string,
  error?: string
}

export interface FSStatResponse {
  isFile: boolean,
  error?: string
}

export class GenericFileStat implements FileStat {
  type: FileType;
  ctime: number;
  mtime: number;
  size: number;

  constructor(isFile: boolean) {
    this.type = (isFile) ? FileType.File : FileType.Directory;
    this.ctime = Date.now();
    this.mtime = Date.now();
    this.size = 0;
  }
}

export default class MetalsFileSystemProvider implements FileSystemProvider {
  readonly onDidChangeEmitter = new EventEmitter<Uri>();
  readonly onDidChange = this.onDidChangeEmitter.event;
  readonly client: LanguageClient;
  readonly outputChannel: OutputChannel;

  constructor(client: LanguageClient,
    outputChannel: OutputChannel) {
    this.outputChannel = outputChannel;
    this.client = client;
  }

  private _emitter = new EventEmitter<FileChangeEvent[]>();
  readonly onDidChangeFile: Event<FileChangeEvent[]> = this._emitter.event;

  stat(uri: Uri): FileStat | Thenable<FileStat> {
    return this.client.sendRequest(ExecuteCommandRequest.type, {
      // TODO move to ServerCommands
      command: "filesystem-stat",
      arguments: [uri.toString(true)],
    }).then((result) => {
      // TODO how much info is required here?
      const value = result as FSStatResponse;
      return new GenericFileStat(value.isFile);
    });
  }

  toReadDirResult(response: FSReadDirectoryResponse): [string, FileType] {
    return [response.name, response.isFile ? FileType.File : FileType.Directory]
  }

  readDirectory(uri: Uri): [string, FileType][] | Thenable<[string, FileType][]> {
    return this.client.sendRequest(ExecuteCommandRequest.type, {
      // TODO move to ServerCommands
      command: "filesystem-read-directory",
      arguments: [uri.toString(true)],
    }).then((result) => {
      const value = result as FSReadDirectoryResponse[];
      return value.map(this.toReadDirResult);
    });
  }

  readFile(uri: Uri): Uint8Array | Thenable<Uint8Array> {
    return this.client.sendRequest(ExecuteCommandRequest.type, {
      // TODO move to ServerCommands
      command: "filesystem-read-file",
      arguments: [uri.toString(true)],
    }).then((result) => {
      const { value, error } = result as FSReadFileResponse;
      let contents: string;
      if (value != null) {
        contents = value;
      } else {
        if (error)
          contents = error;
        else
          contents = "Unknown error";
      }
      return Buffer.from(contents);
    });
  }


  watch(uri: Uri, options: { recursive: boolean; excludes: string[]; }): Disposable {
    this.outputChannel.appendLine(`ignoring watch ${uri} ${options}`);
    throw new Error(`watch ${uri} ${options} not implemented.`);
  }
  createDirectory(uri: Uri): void | Thenable<void> {
    this.outputChannel.appendLine(`ignoring createDirectory ${uri}`);
    throw new Error(`createDirectory ${uri} not implemented.`);
  }
  delete(uri: Uri, options: { recursive: boolean; }): void | Thenable<void> {
    this.outputChannel.appendLine(`ignoring delete ${uri} ${options}`);
    throw new Error(`delete ${uri} ${options} not implemented.`);
  }
  rename(oldUri: Uri, newUri: Uri, options: { overwrite: boolean; }): void | Thenable<void> {
    this.outputChannel.appendLine(`ignoring rename ${oldUri} ${newUri} ${options}`);
    throw new Error(`rename ${oldUri} ${newUri} ${options} not implemented.`);
  }
  writeFile(uri: Uri, content: Uint8Array, options: { create: boolean; overwrite: boolean; }): void | Thenable<void> {
    this.outputChannel.appendLine(`ignoring writeFile ${uri} ${content} ${options}`);
    throw new Error(`writeFile ${uri} ${content} ${options} not implemented.`);
  }
}
