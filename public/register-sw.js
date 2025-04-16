// サービスワーカーが利用可能かチェック
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('サービスワーカーの登録に成功しました。スコープ:', registration.scope);
      })
      .catch((error) => {
        console.error('サービスワーカーの登録に失敗しました:', error);
      });
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
});