import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-center text-2xl">ログイン</CardTitle>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<div className="py-8 text-center text-gray-400">読み込み中...</div>}>
          <LoginForm />
        </Suspense>
      </CardContent>
    </Card>
  );
}
