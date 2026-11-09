import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthMode } from "./_auth/AuthMode";
import { databaseAuthEnabled, signupEnabled, approvalsEnabled, localStaffSignupConfigured, ownerSetupConfigured, ownerRequestsConfigured } from "../lib/auth-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Alana Pâtisserie",
  description: "Sistem Informasi Persediaan Alana Pâtisserie",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><AuthMode enabled={databaseAuthEnabled()} signup={signupEnabled()} approvals={approvalsEnabled()} localStaff={localStaffSignupConfigured()} ownerSetup={ownerSetupConfigured()} ownerRequests={ownerRequestsConfigured()}>{children}</AuthMode></body>
    </html>
  );
}
