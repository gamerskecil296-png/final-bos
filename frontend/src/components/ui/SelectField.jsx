import React from 'react';
import * as Select from '@radix-ui/react-select';
import { ChevronDown, Check } from 'lucide-react';

export function SelectField({ value, onValueChange, placeholder, children, className, disabled }) {
  const val = value === "" ? "__empty__" : value;
  const handleValueChange = (newVal) => {
    if (onValueChange) {
      onValueChange(newVal === "__empty__" ? "" : newVal);
    }
  };

  return (
    <Select.Root value={val} onValueChange={handleValueChange} disabled={disabled}>
      <Select.Trigger className={`
        h-10 flex items-center justify-between gap-2 flex-nowrap whitespace-nowrap
        rounded-xl border border-[var(--theme-border)] bg-white
        px-3 text-sm text-[var(--theme-text)]
        hover:border-[var(--theme-primary)] focus:outline-none
        focus:ring-2 focus:ring-[var(--theme-primary-light)]
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}
      `}>
        <span className="truncate min-w-0 flex-1 text-left"><Select.Value placeholder={placeholder} /></span>
        <Select.Icon className="shrink-0"><ChevronDown className="h-4 w-4 text-[var(--theme-text-muted)]" /></Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content className="
          rounded-xl border border-[var(--theme-border)] bg-white
          shadow-md z-[1000] overflow-hidden
        ">
          <Select.Viewport className="p-1">
            {children}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

export function SelectOption({ value, children }) {
  const val = value === "" ? "__empty__" : value;
  return (
    <Select.Item value={val} className="
      flex items-center gap-2 rounded-lg px-3 py-2 text-sm
      text-[var(--theme-text)] cursor-pointer outline-none
      data-[highlighted]:bg-[var(--theme-primary-light)]
      data-[highlighted]:text-[var(--theme-primary)]
      relative pl-8 pr-2
    ">
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <Select.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </Select.ItemIndicator>
      </span>
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
}
