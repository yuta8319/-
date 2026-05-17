// app/layout.jsx
export const metadata = {
  title: 'おでかけカレンダー | 東京イベントナビ',
  description: '東京23区のお祭り・花火・子どもイベント・大人向けイベントを一覧で確認できるカレンダーアプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'おでかけカレンダー',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="theme-color" content="#F2A7BB" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#FFF8F2' }}>
        {children}
      </body>
    </html>
  );
}
