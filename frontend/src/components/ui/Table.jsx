import React from "react";
import { cn } from "@/lib/utils";

const Table = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...rest}
      />
    </div>
  );
});
Table.displayName = "Table";

const TableHeader = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <thead
      ref={ref}
      className={cn("bg-[#fafafa] border-b border-[#f5f5f5]", className)}
      {...rest}
    />
  );
});
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0 bg-white", className)}
      {...rest}
    />
  );
});
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <tfoot
      ref={ref}
      className={cn(
        "border-t bg-[#fafafa]/50 font-medium [&>tr]:last:border-b-0",
        className
      )}
      {...rest}
    />
  );
});
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-[#f5f5f5] transition-colors hover:bg-[#fafafa]/50 data-[state=selected]:bg-[#fafafa]",
        className
      )}
      {...rest}
    />
  );
});
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <th
      ref={ref}
      className={cn(
        "h-12 px-6 text-left align-middle font-bold text-[#a3a3a3] text-[10px] uppercase tracking-widest [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...rest}
    />
  );
});
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <td
      ref={ref}
      className={cn(
        "px-6 py-4 align-middle [&:has([role=checkbox])]:pr-0",
        className
      )}
      {...rest}
    />
  );
});
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <caption
      ref={ref}
      className={cn("mt-4 text-sm text-muted-foreground", className)}
      {...rest}
    />
  );
});
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};