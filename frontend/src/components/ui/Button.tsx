import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  children: React.ReactNode;
}

export function Button({ variant = 'primary', children, className = '', ...props }: ButtonProps) {
  let baseClass = "inline-flex items-center justify-center font-bold text-xs uppercase tracking-widest transition-all duration-200 select-none rounded-none";
  let variantClass = "";

  if (variant === 'primary') {
    // Uses the CSS variable for the theme primary accent color
    variantClass = "bg-accent text-black hover:brightness-110 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none px-6 py-4";
  } else if (variant === 'outline') {
    variantClass = "border border-white/20 hover:border-white hover:bg-white/5 text-white active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none px-6 py-4";
  } else if (variant === 'ghost') {
    variantClass = "text-white/60 hover:text-white hover:bg-white/5 disabled:opacity-20 disabled:pointer-events-none px-4 py-2.5";
  }

  return (
    <button
      className={`${baseClass} ${variantClass} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
