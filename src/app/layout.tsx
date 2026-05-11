import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
    title: {
        default: "Koushik Mondal | Satellite Simulation & Scalable Web Systems",
        template: "%s | Koushik Mondal"
    },
    description: "Portfolio of Koushik Mondal, a software engineer building satellite simulation systems, geospatial visualization interfaces, and scalable frontend applications with React, Next.js, TypeScript, Cesium, and Mapbox.",
    applicationName: "Koushik Mondal Portfolio",
    authors: [{ name: "Koushik Mondal" }],
    creator: "Koushik Mondal",
    keywords: [
        "Koushik Mondal",
        "Software Engineer",
        "Satellite Simulation",
        "Geospatial Visualization",
        "Frontend Engineer",
        "React",
        "Next.js",
        "TypeScript",
        "Cesium",
        "Mapbox",
        "Three.js",
        "Scalable Web Systems"
    ],
    icons: {
        icon: [{ url: "/koushik.png", type: "image/jpeg" }],
        apple: [{ url: "/koushik.png", type: "image/jpeg" }]
    },
    openGraph: {
        title: "Koushik Mondal | Satellite Simulation & Scalable Web Systems",
        description: "Advanced interactive systems portfolio focused on satellite simulation, geospatial visualization, and production-grade frontend architecture.",
        type: "website",
        locale: "en_IN",
        siteName: "Koushik Mondal Portfolio",
        images: [
            {
                url: "/koushik.png",
                width: 1200,
                height: 1200,
                alt: "Koushik Mondal"
            }
        ]
    },
    twitter: {
        card: "summary_large_image",
        title: "Koushik Mondal | Satellite Simulation & Scalable Web Systems",
        description: "Software engineer building satellite simulation, geospatial visualization, and scalable frontend systems.",
        images: ["/koushik.png"]
    }
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
