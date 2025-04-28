// Firebase Storageを使用するためのユーティリティ関数
import {
  ref,
  uploadBytes,
  getDownloadURL,
  listAll,
  deleteObject,
  type UploadResult,
  type StorageReference,
} from 'firebase/storage';
import { storage } from './firebase';

/**
 * ファイルをアップロードする
 * @param file アップロードするファイル
 * @param path 保存先のパス（例: 'uploads/user123/profile.jpg'）
 * @returns アップロード結果とダウンロードURL
 */
export async function uploadFile(file: File, path: string): Promise<{ result: UploadResult; url: string }> {
  const storageRef = ref(storage, path);
  const result = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(result.ref);
  return { result, url };
}

/**
 * 指定したパスのファイルのダウンロードURLを取得する
 * @param path ファイルのパス
 * @returns ダウンロードURL
 */
export async function getFileUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
}

/**
 * 指定したディレクトリ内のファイル一覧を取得する
 * @param directory ディレクトリのパス
 * @returns StorageReferenceの配列
 */
export async function listFiles(directory: string): Promise<StorageReference[]> {
  const storageRef = ref(storage, directory);
  const result = await listAll(storageRef);
  return result.items;
}

/**
 * 指定したパスのファイルを削除する
 * @param path ファイルのパス
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

// getOpeningDays関数はsrc/lib/openingDays.tsで既に実装されているため削除