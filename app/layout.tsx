import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Source_Code_Pro } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const sourceCode = Source_Code_Pro({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-code",
});

export const metadata: Metadata = {
  title: "출고 엑셀 변환·운송장 연결",
  description:
    "쇼핑몰 주문 엑셀을 택배 양식으로 바꾸고, 운송장번호를 EMP 매출장부에 연결합니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${plusJakarta.className} ${sourceCode.variable}`}>
        {children}
      </body>
    </html>
  );
}
