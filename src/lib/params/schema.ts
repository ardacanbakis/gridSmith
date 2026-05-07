import { z } from 'zod';

export const UnitsSchema = z.enum(['metric', 'imperial']);
export type Units = z.infer<typeof UnitsSchema>;

export const LabelStyleSchema = z.enum(['none', 'paperPocket', 'clipTab', 'embossText', 'engraveText']);
export type LabelStyle = z.infer<typeof LabelStyleSchema>;

export const BitSetIdSchema = z.enum([
  'metric-basic',
  'metric-fine',
  'fractional-inch',
  'letter',
  'number',
  'router-quarter',
  'router-eighth',
  'router-6mm',
  'router-8mm',
  'router-12mm',
  'battery-aa',
  'battery-aaa',
  'battery-18650-4',
  'battery-18650-8',
  'battery-cr2032',
  'battery-mixed',
  'custom',
]);
export type BitSetId = z.infer<typeof BitSetIdSchema>;

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
  labelText: z.string().max(40).default('Label'),
  labelHeight: z.number().min(2).max(20).default(6),
  labelDepth: z.number().min(0.2).max(2.5).default(0.6),
});
export type BinParams = z.infer<typeof BinParamsSchema>;

export const DrillBitHolderParamsSchema = z.object({
  kind: z.literal('drillBitHolder'),
  cellsX: z.number().int().min(1).max(20).default(5),
  cellsY: z.number().int().min(1).max(20).default(1),
  heightUnits: z.number().int().min(2).max(30).default(3),
  bitSet: BitSetIdSchema.default('metric-basic'),
  customBits: z.array(z.number().min(0.3).max(25)).default([]),
  holeDepth: z.number().min(2).max(50).default(15),
  clearance: z.number().min(0).max(1).default(0.1),
  spacing: z.number().min(0.5).max(10).default(2),
  edgeClearance: z.number().min(1).max(10).default(3),
  stackingLip: z.boolean().default(true),
  magnetHoles: z.boolean().default(false),
  screwHoles: z.boolean().default(false),
});
export type DrillBitHolderParams = z.infer<typeof DrillBitHolderParamsSchema>;

export const CompartmentLabelStyleSchema = z.enum(['none', 'emboss', 'engrave']);
export type CompartmentLabelStyle = z.infer<typeof CompartmentLabelStyleSchema>;

export const ScrewOrganizerParamsSchema = z.object({
  kind: z.literal('screwOrganizer'),
  cellsX: z.number().int().min(1).max(20).default(3),
  cellsY: z.number().int().min(1).max(20).default(2),
  heightUnits: z.number().int().min(2).max(30).default(4),
  wallThickness: z.number().min(0.8).max(4).default(1.2),
  cols: z.number().int().min(1).max(10).default(4),
  rows: z.number().int().min(1).max(10).default(2),
  stackingLip: z.boolean().default(true),
  magnetHoles: z.boolean().default(false),
  screwHoles: z.boolean().default(false),
  labelStyle: LabelStyleSchema.default('clipTab'),
  labelText: z.string().max(40).default('SCREWS'),
  labelHeight: z.number().min(2).max(20).default(5),
  labelDepth: z.number().min(0.2).max(2.5).default(0.6),
  tiltDegrees: z.number().min(0).max(20).default(8),
  compartmentLabelStyle: CompartmentLabelStyleSchema.default('none'),
  compartmentLabels: z.array(z.string().max(8)).default([]),
  compartmentLabelHeight: z.number().min(2).max(12).default(4),
  compartmentLabelDepth: z.number().min(0.2).max(2).default(0.4),
});
export type ScrewOrganizerParams = z.infer<typeof ScrewOrganizerParamsSchema>;

export const PartsTrayParamsSchema = z.object({
  kind: z.literal('partsTray'),
  cellsX: z.number().int().min(1).max(20).default(2),
  cellsY: z.number().int().min(1).max(20).default(2),
  heightUnits: z.number().int().min(1).max(30).default(2),
  pocketShape: z.enum(['circle', 'square']).default('circle'),
  pocketSize: z.number().min(3).max(60).default(22),
  pocketDepth: z.number().min(1).max(50).default(10),
  pocketCols: z.number().int().min(1).max(20).default(3),
  pocketRows: z.number().int().min(1).max(20).default(3),
  pocketSpacing: z.number().min(0.5).max(10).default(2),
  edgeClearance: z.number().min(1).max(15).default(3),
  stackingLip: z.boolean().default(false),
  magnetHoles: z.boolean().default(false),
  screwHoles: z.boolean().default(false),
});
export type PartsTrayParams = z.infer<typeof PartsTrayParamsSchema>;

export const ModelParamsSchema = z.discriminatedUnion('kind', [
  BaseplateParamsSchema,
  BinParamsSchema,
  DrillBitHolderParamsSchema,
  ScrewOrganizerParamsSchema,
  PartsTrayParamsSchema,
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
