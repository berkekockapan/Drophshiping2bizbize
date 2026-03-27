import {
  cleanImageMetadata,
  type MetadataCleanerErrorResult,
  type MetadataCleanerResult,
  type MetadataCleanerSuccessResult,
} from "../lib/metadataCleaner";

export interface MetadataCleanerWorkerRequest {
  id: string;
  fileName: string;
  bytes: ArrayBuffer;
}

export interface MetadataCleanerWorkerSuccessResponse {
  id: string;
  status: "success";
  fileName: string;
  format: MetadataCleanerSuccessResult["format"];
  cleanedBytes: ArrayBuffer;
  removedMetadataBlocks: string[];
  changed: boolean;
}

export interface MetadataCleanerWorkerErrorResponse {
  id: string;
  status: "error";
  fileName: string;
  format: MetadataCleanerErrorResult["format"];
  code: MetadataCleanerErrorResult["code"];
  message: string;
}

export type MetadataCleanerWorkerResponse = MetadataCleanerWorkerSuccessResponse | MetadataCleanerWorkerErrorResponse;

type MetadataCleanerWorkerScope = {
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<MetadataCleanerWorkerRequest>) => void,
  ): void;
  postMessage(message: MetadataCleanerWorkerResponse, transfer?: Transferable[]): void;
};

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

export function handleMetadataCleanerWorkerRequest(request: MetadataCleanerWorkerRequest): MetadataCleanerWorkerResponse {
  const result: MetadataCleanerResult = cleanImageMetadata({
    fileName: request.fileName,
    bytes: new Uint8Array(request.bytes),
  });

  if (result.status === "success") {
    return {
      id: request.id,
      status: "success",
      fileName: request.fileName,
      format: result.format,
      cleanedBytes: toExactArrayBuffer(result.cleanedBytes),
      removedMetadataBlocks: result.removedMetadataBlocks,
      changed: result.changed,
    };
  }

  return {
    id: request.id,
    status: "error",
    fileName: request.fileName,
    format: result.format,
    code: result.code,
    message: result.message,
  };
}

export function registerMetadataCleanerWorker(target: MetadataCleanerWorkerScope = self as MetadataCleanerWorkerScope) {
  target.addEventListener("message", (event: MessageEvent<MetadataCleanerWorkerRequest>) => {
    const response = handleMetadataCleanerWorkerRequest(event.data);

    if (response.status === "success") {
      target.postMessage(response, [response.cleanedBytes]);
      return;
    }

    target.postMessage(response);
  });
}

if (typeof self !== "undefined" && "importScripts" in self && typeof (self as { importScripts?: unknown }).importScripts === "function") {
  registerMetadataCleanerWorker(self as MetadataCleanerWorkerScope);
}
