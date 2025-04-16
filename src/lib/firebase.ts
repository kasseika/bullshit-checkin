// Firebase関連の設定と初期化
import { initializeApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Firebaseの設定
// 環境変数から設定を読み込む
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "bullshit-checkin",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Firebaseの初期化（サーバーサイドレンダリングを考慮）
// Next.jsではサーバーサイドとクライアントサイドの両方で実行されるため、
// グローバル変数を使って初期化を一度だけ行うようにします
let firebaseApp;
let firestoreDb: Firestore;

if (typeof window !== 'undefined') {
  // クライアントサイドの場合
  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    firestoreDb = getFirestore(firebaseApp);
  }
} else {
  // サーバーサイドの場合
  // Next.js 13以降のApp Routerでは、サーバーコンポーネントでFirebaseを使用する場合、
  // 追加の設定が必要になる場合があります
  firebaseApp = initializeApp(firebaseConfig);
  firestoreDb = getFirestore(firebaseApp);
}

export { firestoreDb };