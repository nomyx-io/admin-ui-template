// Component types without React dependencies
export interface ComponentProps {
  [key: string]: any;
}

export interface ReactLike {
  createElement: Function;
  useState: Function;
  useEffect: Function;
  useCallback: Function;
  useMemo?: Function;
  useRef?: Function;
  Component?: any;
  Fragment?: any;
}

export interface ReactDOMLike {
  render?: Function;
  createPortal?: Function;
}

// Generic node type to replace ReactNode
export type UINode = any;

// Generic element type to replace ReactElement
export type UIElement = any;

// Generic component type
export type UIComponent<P = {}> = (props: P) => UIElement;

// Factory function type
export type ComponentFactory<P = {}> = (React: ReactLike, ReactDOM?: ReactDOMLike) => UIComponent<P>;