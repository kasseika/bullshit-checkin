/**
 * 簡易認証コンポーネント
 * 環境変数で設定されたパスワードで認証
 */
"use client";

import { useState, ReactNode, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

interface AuthWrapperProps {
  children: ReactNode;
}

export function AuthWrapper({ children }: AuthWrapperProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // セッションストレージから認証状態を確認
    const authStatus = sessionStorage.getItem("admin-auth");
    if (authStatus === "authenticated") {
      setIsAuthenticated(true);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // 環境変数から期待するパスワードを取得（ビルド時に埋め込まれる）
    const expectedPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "admin123";

    if (password === expectedPassword) {
      setIsAuthenticated(true);
      sessionStorage.setItem("admin-auth", "authenticated");
    } else {
      setError("パスワードが正しくありません");
    }
  };

  if (isAuthenticated) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            管理者認証
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="管理者パスワードを入力"
                required
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              ログイン
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}