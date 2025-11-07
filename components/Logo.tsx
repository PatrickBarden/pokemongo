import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = false, className = '' }: LogoProps) {
  const sizes = {
    sm: { container: 'h-8 w-8', text: 'text-xs' },
    md: { container: 'h-16 w-16', text: 'text-sm' },
    lg: { container: 'h-24 w-24', text: 'text-base' }
  };

  const sizeClasses = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`${sizeClasses.container} rounded-full bg-poke-blue flex items-center justify-center overflow-hidden`}>
        <Image
          src="https://i.imgur.com/dA4MkwJ.png"
          alt="Logo Plataforma"
          width={size === 'sm' ? 32 : size === 'md' ? 64 : 96}
          height={size === 'sm' ? 32 : size === 'md' ? 64 : 96}
          className="object-cover"
          priority
        />
      </div>
      {showText && (
        <div>
          <h1 className={`font-semibold ${sizeClasses.text} text-white`}>Plataforma</h1>
          <p className={`${sizeClasses.text} text-white/70`}>Intermediação</p>
        </div>
      )}
    </div>
  );
}
