import {
  BackSide,
  Color,
  Mesh,
  ShaderMaterial,
  Vector3,
} from "three";

const VERTEX = /* glsl */ `
uniform float uThickness;
uniform vec2 uViewport;

void main() {
  // Push vertex outward along view-space normal so screen-space thickness is stable.
  vec4 clipPos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  vec3 viewNormal = normalize(normalMatrix * normal);
  // 1 NDC unit spans the whole viewport; convert desired pixel offset to NDC.
  vec2 ndcOffset = viewNormal.xy * (uThickness / uViewport);
  clipPos.xy += ndcOffset * clipPos.w;
  gl_Position = clipPos;
}
`;

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uOutlineColor;
void main() {
  gl_FragColor = vec4(uOutlineColor, 1.0);
}
`;

export interface OutlineMeshOptions {
  thickness: number;
  color: Color | string;
}

export function createOutlineMaterial(
  options: OutlineMeshOptions,
  viewport: Vector3,
): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    side: BackSide,
    depthTest: true,
    depthWrite: true,
    uniforms: {
      uThickness: { value: options.thickness },
      uOutlineColor: { value: new Color(options.color) },
      uViewport: { value: viewport },
    },
  });
}

export interface OutlineHandle {
  mesh: Mesh;
  material: ShaderMaterial;
}

export function createOutlineMesh(
  source: Mesh,
  options: OutlineMeshOptions,
  viewport: Vector3,
): OutlineHandle {
  const material = createOutlineMaterial(options, viewport);
  const outline = new Mesh(source.geometry, material);
  outline.frustumCulled = source.frustumCulled;
  outline.renderOrder = (source.renderOrder ?? 0) - 1;
  outline.userData.isOutline = true;
  outline.visible = true;
  return { mesh: outline, material };
}

/**
 * Attach an outline as a child of the source mesh so transforms propagate.
 * Outlines are not added to scene roots by default — call this to attach.
 */
export function attachOutline(source: Mesh, outline: OutlineHandle): void {
  source.add(outline.mesh);
  outline.mesh.matrix.identity();
  outline.mesh.matrixAutoUpdate = false;
  outline.mesh.matrixWorldNeedsUpdate = false;
}
