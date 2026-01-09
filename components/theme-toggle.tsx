'use client';

import * as React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export function ThemeToggle({ variant = 'default', className }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
        <Sun className="h-4 w-4" />
      </Button>
    );
  }

  if (variant === 'icon-only') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className={cn(
          "h-10 w-10 rounded-xl transition-colors touch-target",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          className
        )}
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Alternar tema</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-xl transition-colors",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            className
          )}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Alternar tema</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[140px]">
        <DropdownMenuItem 
          onClick={() => setTheme('light')}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            theme === 'light' && "bg-slate-100 dark:bg-slate-800"
          )}
        >
          <Sun className="h-4 w-4" />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('dark')}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            theme === 'dark' && "bg-slate-100 dark:bg-slate-800"
          )}
        >
          <Moon className="h-4 w-4" />
          <span>Escuro</span>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme('system')}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            theme === 'system' && "bg-slate-100 dark:bg-slate-800"
          )}
        >
          <Monitor className="h-4 w-4" />
          <span>Sistema</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeToggleCompact({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={cn("flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800", className)}>
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "p-2 rounded-lg transition-all",
          theme === 'light' 
            ? "bg-white dark:bg-slate-700 shadow-sm text-poke-blue" 
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <Sun className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "p-2 rounded-lg transition-all",
          theme === 'dark' 
            ? "bg-white dark:bg-slate-700 shadow-sm text-poke-blue" 
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <Moon className="h-4 w-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={cn(
          "p-2 rounded-lg transition-all",
          theme === 'system' 
            ? "bg-white dark:bg-slate-700 shadow-sm text-poke-blue" 
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <Monitor className="h-4 w-4" />
      </button>
    </div>
  );
}
