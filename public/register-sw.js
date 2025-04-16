// サービスワーカーが利用可能かチェック
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('サービスワーカーの登録に成功しました。スコープ:', registration.scope);
        
        // Service Workerの更新をチェック
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Service Workerの更新が見つかりました');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('新しいService Workerがインストールされました');
              // 更新があることをユーザーに通知する（オプション）
              if (window.confirm('アプリの新しいバージョンが利用可能です。更新しますか？')) {
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.error('サービスワーカーの登録に失敗しました:', error);
      });
      
    // オフライン/オンライン状態の変化を監視
    window.addEventListener('online', () => {
      console.log('オンラインになりました');
      document.dispatchEvent(new CustomEvent('app-online'));
    });
    
    window.addEventListener('offline', () => {
      console.log('オフラインになりました');
      document.dispatchEvent(new CustomEvent('app-offline'));
    });
    
    // 初期状態をチェック
    if (navigator.onLine) {
      document.dispatchEvent(new CustomEvent('app-online'));
    } else {
      document.dispatchEvent(new CustomEvent('app-offline'));
    }
  });
}

// PWAのインストールを促すイベント
let deferredPrompt;
const installButton = document.getElementById('install-button');

window.addEventListener('beforeinstallprompt', (e) => {
  // インストールプロンプトを表示しないようにする（後で表示するため）
  e.preventDefault();
  // イベントを保存
  deferredPrompt = e;
  
  // インストールボタンがあれば表示する
  if (installButton) {
    installButton.style.display = 'block';
    
    installButton.addEventListener('click', () => {
      // インストールボタンを非表示にする
      installButton.style.display = 'none';
      
      // インストールプロンプトを表示
      deferredPrompt.prompt();
      
      // ユーザーの選択を待つ
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('ユーザーがインストールを承諾しました');
        } else {
          console.log('ユーザーがインストールを拒否しました');
        }
        // イベントをクリア
        deferredPrompt = null;
      });
    });
  }
});

// アプリがインストールされたときのイベント
window.addEventListener('appinstalled', () => {
  console.log('アプリがインストールされました');
  // インストール完了の通知（オプション）
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('Bullshit Checkin', {
      body: 'アプリがインストールされました。オフラインでも利用できます。',
      icon: '/icons/icon.svg'
    });
  }
});

// オフラインコンテンツの事前キャッシュ
if ('serviceWorker' in navigator && 'caches' in window) {
  // アプリの重要なページをキャッシュ
  const pagesToCache = [
    '/',
    '/checkin/time',
    '/checkin/room',
    '/checkin/purpose',
    '/checkin/count',
    '/checkin/survey',
    '/checkin/confirm',
    '/offline.html'
  ];
  
  // ページが読み込まれた後に非同期でキャッシュ
  window.addEventListener('load', () => {
    setTimeout(() => {
      pagesToCache.forEach(url => {
        fetch(url, { credentials: 'same-origin' })
          .catch(err => console.log('ページのプリキャッシュに失敗しました:', url, err));
      });
    }, 3000); // 3秒後に実行（メインコンテンツの読み込みを妨げないため）
  });
}