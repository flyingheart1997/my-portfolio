import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Koushik Mondal",
    description: "Personal website of Koushik Mondal, a software engineer specializing in web development and open-source contributions. Explore projects, blogs, and contact information.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body suppressHydrationWarning>
                {children}
            </body>
        </html>
    );
}
