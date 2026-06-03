import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-[#111] border ${
            error ? 'border-red-500/50 focus:border-red-500' : 'border-white/10 focus:border-white/30'
          } rounded-none px-4 py-3.5 text-white text-sm placeholder-white/20 focus:outline-none transition-colors ${className}`}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs font-mono text-red-500 uppercase tracking-wider">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
