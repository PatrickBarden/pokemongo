import Image from 'next/image';

interface LogoProps {
  size?: 'xs' | 'sm' | 'sm2' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  className?: string;
}

export function Logo({ size = 'md', showText = false, className = '' }: LogoProps) {
  const sizes = {
    xs:  { imgSize: 32,  text: 'text-xs' },
    sm:  { imgSize: 40,  text: 'text-xs' },
    sm2: { imgSize: 52,  text: 'text-xs' },
    md:  { imgSize: 64,  text: 'text-sm' },
    lg:  { imgSize: 96,  text: 'text-base' },
    xl:  { imgSize: 128, text: 'text-lg' },
  };

  const sizeClasses = sizes[size];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image
        src="/logo.png"
        alt="TGP GO"
        width={sizeClasses.imgSize}
        height={sizeClasses.imgSize}
        className="object-contain drop-shadow-md"
        priority
      />
      {showText && (
        <div>
          <h1 className={`font-semibold ${sizeClasses.text} text-foreground`}>TGP GO</h1>
          <p className={`${sizeClasses.text} text-muted-foreground`}>Plataforma</p>
        </div>
      )}
    </div>
  );
}
