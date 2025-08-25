// Override React 19 types to be compatible with Ant Design
import * as React from 'react';

declare module 'react' {
  // Override ReactNode to exclude Promise for compatibility
  type ReactNode = React.ReactElement | string | number | React.ReactFragment | React.ReactPortal | boolean | null | undefined;
}