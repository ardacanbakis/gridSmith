import { z } from 'zod';

export const UnitsSchema = z.enum(['metric', 'imperial']);
export type Units = z.infer<typeof UnitsSchema>;

export const LabelStyleSchema = z.enum(['none', 'paperPocket', 'clipTab']);
export type LabelStyle = z.infer<typeof LabelStyleSchema>;

export const BaseplateParamsSchema = z.object({
  kind: z.literal('baseplate'),
  cellsX: z.number().int().min(1).max(20).default(2),
  cellsY: z.number().int().min(1).max(20).default(2),
  style: z.enum(['minimal', 'rigid']).default('minimal'),
  magnetHoles: z.boolean().default(false),
  screwHoles: z.boolean().default(false),
});
export type BaseplateParams = z.infer<typeof BaseplateParamsSchema>;

export const BinParamsSchema = z.object({
  kind: z.literal('bin'),
  cellsX: z.number().int().min(1).max(20).default(1),
  cellsY: z.number().int().min(1).max(20).default(1),
  heightUnits: z.number().int().min(2).max(30).default(3),
  hollow: z.boolean().default(true),
  wallThickness: z.number().min(0.8).max(4).default(1.2),
  stackingLip: z.boolean().default(true),
  magnetHoles: z.boolean().default(false),
  screwHoles: z.boolean().default(false),
  scoopRamp: z.boolean().default(false),
  divX: z.number().int().min(1).max(10).default(1),
  divY: z.number().int().min(1).max(10).default(1),
  labelStyle: LabelStyleSchema.default('none'),
});
export type BinParams = z.infer<typeof BinParamsSchema>;

export const ModelParamsSchema = z.discriminatedUnion('kind', [
  BaseplateParamsSchema,
  BinParamsSchema,
]);
export type ModelParams = z.infer<typeof ModelParamsSchema>;

export const GridSpecSchema = z.object({
  gridUnit: z.number().min(10).max(120).default(42),
  heightUnit: z.number().min(2).max(30).default(7),
});
export type GridSpec = z.infer<typeof GridSpecSchema>;

export const DesignSchema = z.object({
  v: z.literal(1),
  units: UnitsSchema.default('metric'),
  spec: GridSpecSchema.default({ gridUnit: 42, heightUnit: 7 }),
  model: ModelParamsSchema,
});
export type Design = z.infer<typeof DesignSchema>;

export const DEFAULT_DESIGN: Design = {
  v: 1,
  units: 'metric',
  spec: { gridUnit: 42, heightUnit: 7 },
  model: BinParamsSchema.parse({ kind: 'bin' }),
};
