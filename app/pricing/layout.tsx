import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Pricing — crust by Craftorā",
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
