/** The temple loading screen: the temple's name and element, and how many of its floors are ready. */
export interface TempleLoadingProps {
  open: boolean;
  name?: string;
  element?: string;
  done?: number;
  total?: number;
}
