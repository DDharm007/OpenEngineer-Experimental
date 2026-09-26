import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Docs for crust by Craftorā - Ai Website Builder",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
