// PWA関連の型定義

// BeforeInstallPromptEvent型の定義
export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

// グローバル型の拡張
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
    appinstalled: Event;
  }
  
  // NavigatorのPWA拡張
  interface Navigator {
    standalone?: boolean;
  }

  interface ServiceWorkerRegistration {
    sync: SyncManager;
  }

  interface Window {
    SyncManager: SyncManager;
  }
}

export {};
