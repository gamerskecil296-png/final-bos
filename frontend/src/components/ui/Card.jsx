import React from "react";
import { cn } from "@/lib/utils";

const Card = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <div
      ref={ref}
      className={cn(
        "rounded-2xl border border-border shadow-sm bg-surface font-sans text-left transition-all duration-300 hover:shadow-md",
        className
      )}
      {...rest}
    />
  );
});
Card.displayName = "Card";

const CardHeader = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <div
      ref={ref}
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...rest}
    />
  );
});
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <h3
      ref={ref}
      className={cn(
        "text-xl font-bold leading-none tracking-tight text-slate-900 font-headline",
        className
      )}
      {...rest}
    />
  );
});
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <p
      ref={ref}
      className={cn("text-sm text-slate-500 font-medium font-body", className)}
      {...rest}
    />
  );
});
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <div
      ref={ref}
      className={cn("p-6 pt-0 font-headline", className)}
      {...rest}
    />
  );
});
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef((props, ref) => {
  const { className, ...rest } = props;
  return (
    <div
      ref={ref}
      className={cn("flex items-center p-6 pt-0 font-headline", className)}
      {...rest}
    />
  );
});
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};