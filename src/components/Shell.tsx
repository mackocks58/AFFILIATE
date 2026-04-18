import type { ReactNode } from "react";
import { Navbar } from "./Navbar";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <Navbar />
      {children}
    </div>
  );
}
