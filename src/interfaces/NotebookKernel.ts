/** A Jupyter kernel installed by Metals for a notebook. */
export interface NotebookKernel {
  /** The kernelspec's directory name, as Jupyter lists it. */
  kernelId: string;
  displayName: string;
  /** True if the kernel didn't exist before this install. */
  newlyInstalled: boolean;
}
