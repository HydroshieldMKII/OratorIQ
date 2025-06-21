import * as React from "react";
import { cn } from "../../lib/utils";

const Progress = React.forwardRef(({ className, value, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700",
      className
    )}
    {...props}
  >
    <div
      className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-500 ease-in-out"
      style={{ width: `${value || 0}%` }}
    />
  </div>
));
Progress.displayName = "Progress";

export { Progress };
