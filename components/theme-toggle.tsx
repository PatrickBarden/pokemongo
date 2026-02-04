'use client';

import * as React from 'react';
import { Monitor } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import Image from 'next/image';

// Ícones customizados do tema
const THEME_ICONS = {
  sun: 'https://i.imgur.com/ySViqtK.png',
  moon: 'https://i.imgur.com/TxmgKQP.png',
};

interface ThemeToggleProps {
  variant?: 'default' | 'compact' | 'icon-only';
  className?: string;
}

export function ThemeToggle({ variant = 'default', className }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={cn("h-9 w-9", className)}>
        <div className="h-5 w-5 bg-muted rounded-full animate-pulse" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  if (variant === 'icon-only') {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
        className={cn(
          "h-10 w-10 rounded-xl transition-all touch-target relative overflow-hidden",
          "hover:bg-slate-100 dark:hover:bg-slate-800",
          "hover:scale-105 active:scale-95",
          className
        )}
      >
        <Image
          src={THEME_ICONS.sun}
          alt="Modo claro"
          width={28}
          height={28}
          className={cn(
            "absolute transition-all duration-300",
            isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
          )}
          unoptimized
        />
        <Image
          src={THEME_ICONS.moon}
          alt="Modo escuro"
          width={28}
          height={28}
          className={cn(
            "absolute transition-all duration-300",
            isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
          )}
          unoptimized
        />
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
            "h-9 w-9 rounded-xl transition-all relative overflow-hidden",
            "hover:bg-slate-100 dark:hover:bg-slate-800",
            "hover:scale-105",
            className
          )}
        >
          <Image
            src={THEME_ICONS.sun}
            alt="Modo claro"
            width={20}
            height={20}
            className={cn(
              "absolute transition-all duration-300",
              isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
            )}
            unoptimized
          />
          <Image
            src={THEME_ICONS.moon}
            alt="Modo escuro"
            width={20}
            height={20}
            className={cn(
              "absolute transition-all duration-300",
              isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
            )}
            unoptimized
          />
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
          <Image src={THEME_ICONS.sun} alt="" width={16} height={16} unoptimized />
          <span>Claro</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme('dark')}
          className={cn(
            "flex items-center gap-2 cursor-pointer",
            theme === 'dark' && "bg-slate-100 dark:bg-slate-800"
          )}
        >
          <Image src={THEME_ICONS.moon} alt="" width={16} height={16} unoptimized />
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
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === 'dark';

  return (
    <div className={cn("flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800", className)}>
      <button
        onClick={() => setTheme('light')}
        className={cn(
          "p-2 rounded-lg transition-all",
          theme === 'light'
            ? "bg-white dark:bg-slate-700 shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <Image src={THEME_ICONS.sun} alt="Claro" width={16} height={16} unoptimized />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={cn(
          "p-2 rounded-lg transition-all",
          theme === 'dark'
            ? "bg-white dark:bg-slate-700 shadow-sm"
            : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
        )}
      >
        <Image src={THEME_ICONS.moon} alt="Escuro" width={16} height={16} unoptimized />
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
