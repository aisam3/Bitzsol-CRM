import React from "react";
import Link from "next/link";
import { Button } from "../ui/Button";

export const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-center p-4">
      <div className="glass w-full max-w-7xl px-6 py-4 rounded-2xl flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 premium-gradient rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
            B
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground hidden sm:block">
            Bitzsol <span className="text-primary font-black">CRM</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</Link>
          <Link href="#solutions" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Solutions</Link>
          <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Pricing</Link>
          <Link href="#about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">About</Link>
        </div>

        <div className="flex items-center gap-4">
          <Link href="/login">
            <Button variant="outline" size="sm" className="hidden sm:flex">Log in</Button>
          </Link>
          <Link href="/login">
            <Button variant="primary" size="sm">Get Started</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
