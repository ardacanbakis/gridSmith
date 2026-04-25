declare module '@jscadui/3mf-export' {
  export interface ContentTypesFile {
    name: string;
    content: string;
  }
  export const fileForContentTypes: ContentTypesFile;

  export class FileForRelThumbnail {
    constructor();
    readonly name: string;
    readonly content: string;
    add3dModel(path: string): void;
    addThumbnail(path: string): void;
    addRel(target: string, xmlType: string): void;
  }

  export interface Mesh3MFSimple {
    id: string;
    name?: string;
    vertices: Float32Array;
    indices: Uint32Array;
    transform: number[];
  }

  export interface Header3MF {
    unit?: 'micron' | 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot';
    title?: string;
    description?: string;
    application?: string;
  }

  export function to3dmodelSimple(
    meshes: Mesh3MFSimple[],
    header?: Header3MF,
    precision?: number,
  ): string;

  export function to3dmodel(opts: {
    meshes?: Array<{ id: string; vertices: Float32Array; indices: Uint32Array; name?: string }>;
    components?: unknown[];
    items?: Array<{ objectID: string; transform?: number[] }>;
    precision?: number;
    header?: Header3MF;
  }): string;
}
