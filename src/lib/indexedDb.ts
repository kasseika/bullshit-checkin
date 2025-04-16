import { CheckInData } from './firestore';

// IndexedDBの設定
const DB_NAME = 'bullshitCheckinDB';
const DB_VERSION = 2; // バージョンを上げて再初期化を強制する
const STORE_NAME = 'pendingCheckins';

/**
 * IndexedDBを初期化する関数
 * @returns Promise<IDBDatabase>
 */
export async function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // データベースを開く
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    // データベースのバージョンが上がった時やDBが存在しない時に実行される
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // オブジェクトストアが存在しない場合は作成
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // auto-incrementをtrueにして、一意のIDを自動生成
        // keyPathはそのオブジェクトの一意のキーとなるプロパティ名
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        console.log(`オブジェクトストア '${STORE_NAME}' を作成しました`);
      }
    };
    
    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      console.log('IndexedDBの接続に成功しました');
      resolve(db);
    };
    
    request.onerror = (event) => {
      console.error('IndexedDBの接続に失敗しました:', (event.target as IDBOpenDBRequest).error);
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * チェックインデータをIndexedDBに保存する関数
 * @param data チェックインデータ
 * @returns 保存が成功した場合はtrue、失敗した場合はfalse
 */
export async function saveToIndexedDB(data: CheckInData): Promise<boolean> {
  try {
    const db = await initIndexedDB();
    
    return new Promise((resolve) => {
      // トランザクションを開始
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // データを保存
      const request = store.add({
        data,
        timestamp: new Date().toISOString(),
        attempts: 0 // 再送信試行回数
      });
      
      request.onsuccess = () => {
        console.log('チェックインデータをIndexedDBに保存しました:', data);
        db.close();
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error('チェックインデータのIndexedDBへの保存に失敗しました:', (event.target as IDBRequest).error);
        db.close();
        resolve(false);
      };
    });
  } catch (error) {
    console.error('IndexedDBへの保存中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * 保存されているすべてのチェックインデータを取得する関数
 * @returns 保存されているチェックインデータの配列
 */
export async function getAllPendingCheckins(): Promise<Array<{ id: number, data: CheckInData, timestamp: string, attempts: number }>> {
  try {
    const db = await initIndexedDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      
      request.onsuccess = (event) => {
        const result = (event.target as IDBRequest).result;
        db.close();
        resolve(result);
      };
      
      request.onerror = (event) => {
        console.error('IndexedDBからのデータ取得に失敗しました:', (event.target as IDBRequest).error);
        db.close();
        resolve([]);
      };
    });
  } catch (error) {
    console.error('IndexedDBからのデータ取得中にエラーが発生しました:', error);
    return [];
  }
}

/**
 * 特定のチェックインデータをIndexedDBから削除する関数
 * @param id 削除するデータのID
 * @returns 削除が成功した場合はtrue、失敗した場合はfalse
 */
export async function removeFromIndexedDB(id: number): Promise<boolean> {
  try {
    const db = await initIndexedDB();
    
    return new Promise((resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => {
        console.log(`ID: ${id} のチェックインデータをIndexedDBから削除しました`);
        db.close();
        resolve(true);
      };
      
      request.onerror = (event) => {
        console.error(`ID: ${id} のチェックインデータの削除に失敗しました:`, (event.target as IDBRequest).error);
        db.close();
        resolve(false);
      };
    });
  } catch (error) {
    console.error('IndexedDBからのデータ削除中にエラーが発生しました:', error);
    return false;
  }
}

/**
 * 再送信試行回数を更新する関数
 * @param id 更新するデータのID
 * @param attempts 新しい試行回数
 * @returns 更新が成功した場合はtrue、失敗した場合はfalse
 */
export async function updateAttempts(id: number, attempts: number): Promise<boolean> {
  try {
    const db = await initIndexedDB();
    
    return new Promise(async (resolve) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // まず対象のデータを取得
      const getRequest = store.get(id);
      
      getRequest.onsuccess = (event) => {
        const data = (event.target as IDBRequest).result;
        if (data) {
          // 試行回数を更新
          data.attempts = attempts;
          
          // 更新したデータを保存
          const updateRequest = store.put(data);
          
          updateRequest.onsuccess = () => {
            console.log(`ID: ${id} の再送信試行回数を ${attempts} に更新しました`);
            db.close();
            resolve(true);
          };
          
          updateRequest.onerror = (event) => {
            console.error(`ID: ${id} の再送信試行回数の更新に失敗しました:`, (event.target as IDBRequest).error);
            db.close();
            resolve(false);
          };
        } else {
          console.error(`ID: ${id} のデータが見つかりませんでした`);
          db.close();
          resolve(false);
        }
      };
      
      getRequest.onerror = (event) => {
        console.error(`ID: ${id} のデータの取得に失敗しました:`, (event.target as IDBRequest).error);
        db.close();
        resolve(false);
      };
    });
  } catch (error) {
    console.error('IndexedDBのデータ更新中にエラーが発生しました:', error);
    return false;
  }
}