// src/components/layout/Footer.tsx
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-border bg-card mt-auto pb-20 md:pb-0">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h3 className="font-bold text-primary mb-1">TruthVote</h3>
            <p className="text-sm text-muted-foreground">
              Vote on anything. Public opinion, tracked over time.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm">
            <Link href="/about" className="text-muted-foreground hover:text-primary transition-colors">
              About
            </Link>
            <Link href="/docs" className="text-muted-foreground hover:text-primary transition-colors">
              Documentation
            </Link>
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/cookies" className="text-muted-foreground hover:text-primary transition-colors">
              Cookies
            </Link>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TruthVote. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
