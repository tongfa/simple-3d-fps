import { Scene, Vector3, MeshBuilder } from '@babylonjs/core';

export class TrainTrack {
  private points: Array<Vector3>;

    constructor(points: Array<Vector3>) {
      this.points = points
    }

    addToScene(scene: Scene) {
      // for(let i = 0; i < this.points.length-10; i++) {
      //   const p1 = this.points[i];
      //   const t = MeshBuilder.CreateBox(`trackSegment${i}`, { 'width': 4, 'height': 2000, 'depth': 2 }, scene);
      //   t.position = p1;
      //   console.log(`trackSegment${i}`, p1)
      // }
      const step = 2;
      let distanceTraveled = 0;
      let wantedDistanceTraveled = 0;
      for(let i = 1; i < this.points.length; i++) {
        const p1 = this.points[i-1];
        const p2 = this.points[i];

        const angle = Math.atan((p2.x - p1.x) / (p2.z - p1.z));
        const vector = new Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
        const distance = Vector3.Distance(p2,p1);

        const startOffset = (distanceTraveled - wantedDistanceTraveled) % step;
        wantedDistanceTraveled += distance;

        for (let count = 0; wantedDistanceTraveled - distanceTraveled > step; distanceTraveled += step, count++) {
          const t = MeshBuilder.CreateBox(`trackSegment${i}`, { 'width': 8, 'height': 1, 'depth': 0.25 }, scene);
          t.rotate(new Vector3(0, 1, 0), angle);
          t.position = new Vector3(p1.x + (p2.x - p1.x) * step * count / distance, p1.y + (p2.y - p1.y) * step * count / distance - 3, p1.z + (p2.z - p1.z) * step * count / distance)
        }
      }
    }
}