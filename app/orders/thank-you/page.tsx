export default function ThankYou() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-2xl font-bold mb-4">已收到訂單！</h1>
        <p className="mb-4">感謝你的預約，我們會儘快與你聯絡確認細節。</p>
        <a href="/" className="text-sky-600 underline">回到首頁</a>
      </div>
    </div>
  );
}
