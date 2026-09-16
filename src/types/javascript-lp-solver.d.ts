/**
 * Déclaration minimale pour javascript-lp-solver, qui ne publie pas de types.
 * Seule la surface réellement utilisée est décrite.
 */
declare module 'javascript-lp-solver' {
  export type Model = {
    optimize: string;
    opType: 'min' | 'max';
    constraints: Record<string, { min?: number; max?: number; equal?: number }>;
    variables: Record<string, Record<string, number>>;
  };

  export type Solution = { feasible: boolean; result: number; bounded: boolean } & Record<
    string,
    number | boolean
  >;

  const solver: { Solve: (model: Model) => Solution };
  export default solver;
}
