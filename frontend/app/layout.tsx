import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "ReconFlow — Payments Reconciliation",
  description: "Fintech reconciliation dashboard for platform and bank settlement matching",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
