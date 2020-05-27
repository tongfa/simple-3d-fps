import { Scene, Vector3, MeshBuilder, Curve3, Mesh, Quaternion, Path3D } from '@babylonjs/core';

// don't need these yet...
      const midPoint = (A: Vector3, B: Vector3, AtoBmix=0.5) => {
        const Ox = A.x + (B.x - A.x) * AtoBmix;
        const Oy = A.y + (B.y - A.y) * AtoBmix;
        const Oz = A.z + (B.z - A.z) * AtoBmix;
        const O = new Vector3(Ox, Oy, Oz);
        return O;
      }

      // https://math.stackexchange.com/questions/1379217/3-points-in-3d-space-to-find-the-center-of-an-arc-or-circle
      // I choose g.kov's answer
      const centerOfCircumscribedCircle = (A: Vector3, B: Vector3, C: Vector3) => {
        const a = Vector3.Distance(B, C);
        const b = Vector3.Distance(A, C);
        const c = Vector3.Distance(A, B);
        const dFactor = (m: number, n: number, o: number) => Math.pow(m, 2) * (Math.pow(n, 2) + Math.pow(o, 2) - Math.pow(m, 2))
        const Odenom = dFactor(a, b, c) + dFactor(b, a, c) + dFactor(c, b, a);
        const Ox = (dFactor(a, b, c) * A.x + dFactor(b, a, c) * B.x + dFactor(c, b, a) * C.x) / Odenom;
        const Oy = (dFactor(a, b, c) * A.y + dFactor(b, a, c) * B.y + dFactor(c, b, a) * C.y) / Odenom;
        const Oz = (dFactor(a, b, c) * A.z + dFactor(b, a, c) * B.z + dFactor(c, b, a) * C.z) / Odenom;
        const O = new Vector3(Ox, Oy, Oz);
        return O;
      }


export class TrainTrack {
  private points: Array<Vector3>;

    constructor(points: Array<Vector3>) {
      this.points = points
    }

    addToScene(scene: Scene) {

      const railPath = Curve3.CreateCatmullRomSpline(this.points, 5);
      const tiePath = new Path3D(Curve3.CreateCatmullRomSpline(this.points, 20).getPoints());
      const tieStep = 3;

      for (let i = 0.; i <= 1.; i+= tieStep / tiePath.length() ) {
          const t = MeshBuilder.CreateBox(name, { 'width': 8, 'height': 1, 'depth': 0.25 }, scene);
          t.position = tiePath.getPointAt(i).add(new Vector3(0, -3, 0));
          const vRail = tiePath.getNormalAt(i);
          const dot = Vector3.Dot(vRail, new Vector3(0, 0, 1))
          const angle = Math.acos(dot)
          console.log(vRail, angle)
          t.rotate(new Vector3(0, 1, 0), angle + Math.PI / 2);
      }

      const railShapeCorner = new Array<Vector3>().concat([
        new Vector3(2, 5, 0),
        new Vector3(3, 4, 0),
        new Vector3(3, 3, 0),
        new Vector3(2, 2, 0),
        new Vector3(1, 2, 0),
        new Vector3(1, 0, 0),
      ]).map(v => v.scale(0.1));
      const oneRailShape= new Array<Vector3>()
        .concat(railShapeCorner)
        .concat(railShapeCorner.map(v => v.multiply(new Vector3(1, -1, 0))).reverse())
        .concat(railShapeCorner.map(v => v.multiply(new Vector3(-1, -1, 0))))
        .concat(railShapeCorner.map(v => v.multiply(new Vector3(-1, 1, 0))).reverse())
        .concat([railShapeCorner[0]])


      const railShapeEast = new Array<Vector3>()
        .concat(oneRailShape.map(v => v.add(new Vector3(-3, 0, 0))))
        .map(v => v.add(new Vector3(0, -2, 0)))

      const railShapeWest = new Array<Vector3>()
        .concat(oneRailShape.map(v => v.add(new Vector3(3, 0, 0))))
        .map(v => v.add(new Vector3(0, -2, 0)))

      const extrudedRailEast = MeshBuilder.ExtrudeShape("extrudedShape", { shape: railShapeEast, path: railPath.getPoints(), sideOrientation: Mesh.BACKSIDE }, scene);
      const extrudedRailWest = MeshBuilder.ExtrudeShape("extrudedShape", { shape: railShapeWest, path: railPath.getPoints(), sideOrientation: Mesh.BACKSIDE }, scene);

    }
}