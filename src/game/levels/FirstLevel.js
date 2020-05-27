import { Color3, UniversalCamera, Vector3, Mesh } from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials';
import { Control } from '@babylonjs/gui';

import Enemy from '../Enemy';
import UI from '../../base/UI';
import Weapon from '../Weapon';
import Player from '../Player';
import Level from '../../base/Level';
import { TrainTrack } from '../Train.ts';

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

const REGULAR_SPEED = 1;
const POWER_SPEED = 8;

export default class FirstLevel extends Level {

    setProperties() {

        // Menu
        this.menu = null;
        this.weapon = null;
        this.ammoBox = null;

        // Player
        this.player = new Player(this);
        this.playerMesh = null;
        this.playerLife = 100;

        // Enemies
        this.maxEnemies = 10;
        this.currentEnemies = 0;
        this.enemies = [];
        this.enemyDistanceFromCenter = 100;

    }

    setupAssets() {
      return Promise.all([
        this.assets.addMesh('hose', '/assets2/hydrant_low.obj'),
        // this.assets.addMesh('test', '/assets2/freecadtest.obj'),
        this.assets.addMusic('music', '/assets/musics/music.mp3', {volume: 0.1}),
        this.assets.addSound('shotgun', '/assets/sounds/shotgun.wav', { volume: 0.4 }),
        this.assets.addSound('reload', '/assets/sounds/reload.mp3', { volume: 0.4 }),
        this.assets.addSound('empty', '/assets/sounds/empty.wav', { volume: 0.4 }),
        this.assets.addSound('monsterAttack', '/assets/sounds/monster_attack.wav', { volume: 0.3 }),
        this.assets.addSound('playerDamaged', '/assets/sounds/damage.wav', { volume: 0.3 }),
      ]);
    }

    buildScene() {

        this.scene.clearColor = new Color3.FromHexString('#777');

        // Adding lights
        let dirLight = new BABYLON.DirectionalLight("DirectionalLight", new BABYLON.Vector3(0, -1, 0), this.scene);
        dirLight.intensity = 0.3;

        let hemiLight = new BABYLON.HemisphericLight("HemiLight", new BABYLON.Vector3(0, 1, 0), this.scene);
        hemiLight.intensity = 0.5;

        // Skybox
        var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 3520}, this.scene);
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/skybox/skybox", this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.disableLighting = true;
        skybox.material = skyboxMaterial;

        this.scene.gravity = new BABYLON.Vector3(0, -1, 0);
        Promise.all([
          this.createCamera(),
          this.createGround()
        ]).then(() => {
          this.scene.collisionsEnabled = true;
          // Create and set the active camera
          this.camera.applyGravity = true;
          this.camera.checkCollisions = true;
          this.camera._needMoveForGravity = true;
          this.scene.activeCamera = this.camera;
          this.enablePointerLock();

          this.addWeapon();
          this.addTrainTrack();

          this.createHUD();
          this.createMenu();

          this.setupEventListeners();

          this.player.startTimeCounter();
          // this.addSomething('hose')

          const nearMorrisey = new Vector3(-316, 100, -1571);
          const nearHosmer = new Vector3(960, 100, 1088);
          const actualDistance = 16328; // meters
          const fromHosmerToMorrisey = nearMorrisey.subtract(nearHosmer).length()
          console.log('game scale', fromHosmerToMorrisey) // 2949.314666155512
          console.log('actual scale', actualDistance)

        })
    }

    addSomething(meshName) {
        mesh = this.level.assets.getMesh(meshName);
        mesh.setEnabled(true);
        mesh.isVisible = true;

        let transformNode = new BABYLON.TransformNode(meshName + 'TransformNode');

        transformNode.parent = this.scene;
        transformNode.scaling = new BABYLON.Vector3(1, 1, 1);
        transformNode.position = new BABYLON.Vector3(0,0,3);
        mesh.parent = transformNode;
    }

    createGround() {
      return new Promise((resolve) => {
        let groundMaterial = new CustomMaterial('groundMaterial', this.scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture('/assets2/fernie-ground-map-2.png', this.scene);
        // groundMaterial.diffuseTexture.uScale = 1000;
        // groundMaterial.diffuseTexture.vScale = 1000;
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        groundMaterial.Fragment_Before_FragColor(`
          // color = mix(color, vec4(0.0,0.,1.,1.),0.3);
          // color = mix(color, vec4(0.4,0.,0.4,1.),0.3);

          vec3 pos = vPositionW*1.5;

          if (pos.x > -100. && pos.x < 100. && pos.z > -100. && pos.z < 100.) {
            float subSliceSize = 0.2;
            float sliceSize = 0.05;
            float sliceStep = 10.;

            // North to South lines (X)
            float gridParameter = min(1. ,max(0.,min(subSliceSize,abs( sin(pos.x))))/subSliceSize) ;
            // East to West lines (Z)
            gridParameter = min(gridParameter ,max(0.,min(subSliceSize,abs( sin(pos.z ))))/subSliceSize) ;
            // elevation lines (Y)
            // gridParameter = min(gridParameter ,max(0.,min(subSliceSize,abs( sin(pos.y+1.5))))/subSliceSize) ;

            // thicker X lines
            gridParameter = min(gridParameter ,max(0.,min(sliceSize,abs( sin(pos.x/sliceStep))))/sliceSize) ;
            // thicker Z lines
            gridParameter = min(gridParameter ,max(0.,min(sliceSize,abs( sin(pos.z/sliceStep))))/sliceSize) ;
            // thicker Y lines
            // gridParameter = min(gridParameter ,max(0.,min(sliceSize,abs( sin(pos.y/sliceStep+1.5/sliceStep))))/sliceSize) ;


            color = mix(color, vec4(0.,0.,0.,1.),1.-gridParameter);

          }
        `);


        let ground = Mesh.CreateGroundFromHeightMap("ground", "/assets2/fernie-height-map-2.png", 3543, 3543, 400, 0, 270, this.scene, false, resolve);
        ground.checkCollisions = true;
        ground.material = groundMaterial;
      })
    }

    addTrainTrack() {
      const trace = []
        .concat([[-92.7,40.6,5.1],[-91.8,40.6,8.1],[-90.6,40.6,11.4],[-89.5,40.6,14.7],[-88.5,40.6,17.3],[-88.3,40.7,18.5],[-88.1,40.7,19.6],[-87.8,40.7,20.7],[-87.4,40.8,21.8],[-87.1,40.8,22.8],[-86.6,40.9,24],[-86.2,40.9,24.6],[-85.6,40.7,25.8],[-85.1,40.6,26.8],[-84.3,40.6,27.9],[-83.7,40.6,28.9],[-83,40.6,29.8],[-80.5,40.6,32.9],[-78.3,40.6,35.7],[-75.3,40.6,38.7]])
      //   .concat([[681.5, 72.0, -3190.9], [705.4, 72.0, -3175.1], [718.5, 72.0, -3150.0], [750.0, 72.0, -3108.9], [785.1, 72.0, -3059.8], [811.8, 72.0, -3008.7], [844.9, 70.1, -2942.7], [870.5, 70.1, -2895.9]])
      //   .concat([[896.2, 70.1, -2848.8], [927.5, 68.1, -2793.3], [964.6, 68.1, -2739.4]])
      //   .concat([[1031.9, 64.2, -2570.9], [1016.7, 64.2, -2515.9], [989.7, 64.5, -2479.3], [963.4, 66.2, -2445.7], [942.3, 66.2, -2399.3], [917.8, 66.2, -2346.0], [890.6, 65.5, -2315.0], [876.9, 66.2, -2270.5], [853.8, 66.2, -2231.4], [831.4, 66.2, -2199.9], [814.9, 68.1, -2159.2], [791.5, 68.1, -2117.5], [783.5, 68.8, -2074.6], [777.5, 70.9, -2028.0], [773.2, 72.0, -1986.9], [755.3, 74.0, -1950.1], [723.3, 74.0, -1907.6], [692.1, 74.0, -1871.7], [667.6, 74.0, -1836.7], [652.8, 74.0, -1800.5], [641.1, 74.0, -1757.2], [624.9, 74.0, -1712.5], [599.1, 74.0, -1676.6], [562.7, 74.0, -1648.5], [528.5, 74.0, -1617.9], [496.0, 74.0, -1587.7], [463.5, 74.0, -1556.4], [437.4, 74.0, -1527.2], [426.8, 74.0, -1499.6], [421.1, 74.0, -1463.4], [409.9, 74.0, -1428.1], [388.7, 74.0, -1395.4], [360.3, 71.1, -1367.3], [324.9, 68.1, -1337.1], [294.1, 68.1, -1310.9], [263.2, 68.1, -1284.3], [229.3, 68.1, -1254.5]])
      //   .concat([[204.7, 68.1, -1229.9], [151.0, 73.0, -1140.4], [132.5, 71.0, -1026.4], [105.2, 68.1, -974.6], [74.4, 68.1, -931.6], [52.9, 73.1, -897.4], [38.7, 74.0, -842.5], [16.4, 74.0, -780.4], [-9.0, 74.0, -714.2], [-38.1, 73.3, -660.3], [-70.9, 74.0, -608.4], [-107.5, 74.0, -543.0], [-134.8, 74.8, -491.3], [-170.9, 77.9, -445.1], [-186.8, 79.9, -398.6], [-194.5, 81.7, -353.3]])
      //   .concat([[-183.8, 83.0, -302.5],[-162.9, 83.8, -262.3], [-178.9, 81.8, -219.7], [-204.9, 81.8, -194.1]])
      //   .concat([[-226.6, 79.6, -68.3], [-175.1, 77.9, -21.8], [-172.2, 77.9, 32.6], [-134.7, 77.9, 74.1], [-94.5, 77.9, 113.7], [-58.0, 77.9, 150.5], [-6.0, 77.9, 200.8], [36.5, 77.9, 236.3], [80.5, 77.9, 273.5], [121.0, 77.9, 307.7], [163.3, 77.9, 343.5], [210.5, 77.9, 383.2], [253.6, 77.9, 418.4], [304.2, 77.9, 456.7], [350.6, 77.9, 488.7], [401.1, 77.9, 520.7], [438.9, 77.9, 544.0], [467.2, 77.9, 569.7], [483.1, 77.9, 592.4], [501.8, 77.9, 613.5], [526.0, 77.9, 634.2], [556.4, 77.9, 654.6], [576.3, 77.9, 673.5], [607.8, 77.9, 706.4], [637.2, 77.9, 737.9], [661.0, 79.3, 762.8], [685.6, 77.9, 790.2], [708.8, 77.9, 820.0], [733.8, 77.9, 849.4], [762.1, 77.9, 874.1], [798.5, 77.9, 896.2], [834.0, 77.9, 913.8], [896.7, 77.9, 945.6], [934.6, 77.9, 972.3], [963.9, 77.9, 1007.8], [985.4, 77.9, 1044.9], [1008.7, 77.9, 1082.2], [1047.4, 77.9, 1102.9], [1095.7, 77.9, 1114.1], [1137.0, 81.8, 1119.1]])
      //   .concat([[1187.5, 81.8, 1122.2], [1230.5, 81.8, 1126.2], [1268.6, 81.8, 1138.2], [1296.1, 81.8, 1151.3], [1316.3, 81.8, 1168.9], [1336.5, 81.8, 1192.6], [1353.4, 81.8, 1216.0], [1379.3, 81.8, 1252.2], [1399.8, 81.8, 1289.4], [1424.5, 81.8, 1326.8], [1449.4, 81.8, 1360.2], [1464.3, 81.8, 1393.9], [1489.3, 81.8, 1420.9], [1523.4, 81.8, 1445.8], [1578.7, 81.8, 1484.5], [1607.7, 80.7, 1518.9], [1655.9, 81.8, 1568.9], [1675.5, 81.8, 1615.0], [1704.4, 80.3, 1670.4], [1731.6, 77.9, 1710.2], [1765.0, 77.9, 1752.3], [1796.1, 77.9, 1790.4], [1822.7, 77.9, 1828.8], [1849.3, 77.9, 1869.5], [1882.9, 77.9, 1923.0], [1916.6, 77.9, 1973.7], [1952.7, 77.9, 2020.0]])
      //   .concat([[2005.7, 77.9, 2080.1], [2527.8, 77.9, 2585.2], [2611.6, 81.1, 2663.3], [2628.3, 82.8, 2681.9], [2638.6, 83.5, 2703.6], [2663.9, 80.9, 2749.2], [2667.7, 82.8, 2780.5], [2691.8, 83.8, 2806.8], [2731.3, 82.7, 2861.2], [2750.7, 83.5, 2902.3], [2767.8, 83.3, 2931.1], [2787.4, 83.8, 2962.1], [2821.7, 82.4, 3009.6], [2824.7, 84.0, 3024.6], [2833.4, 83.8, 3057.3], [2841.4, 83.0, 3076.1], [2850.0, 82.5, 3098.6], [2861.3, 83.9, 3125.2], [2876.0, 83.3, 3151.3], [2891.4, 82.7, 3183.1]])
      // this.trainTrack = new TrainTrack(trace.map((x => new Vector3(x[0] / 6400 * 3543, (x[1] - 0.75) / 1.91, x[2] / 6400 * 3543))));
      this.trainTrack = new TrainTrack(trace.map((x => new Vector3(x[0], x[1], x[2]))));
      this.trainTrack.addToScene(this.scene);
    }
    addWeapon() {
        this.weapon = new Weapon(this);
        this.weapon.create();
    }

    addEnemies() {

        // Let's remove unnecessary enemies to prevent performance issues
        this.removeUnnecessaryEnemies();

        let quantityOfEnemiesToCreate = this.maxEnemies - this.currentEnemies;

        for(var enemiesQuantity = 0; enemiesQuantity < quantityOfEnemiesToCreate; enemiesQuantity++) {
            let enemy = new Enemy(this).create();

            this.enemies.push(enemy);
            this.currentEnemies++;
        }

        // Increasing the quantity of max enemies
        this.maxEnemies += 1;
        this.enemyDistanceFromCenter += 10;
    }

    removeUnnecessaryEnemies() {
        let enemiesQuantity = this.enemies.length;

        for(var i = 0; i < enemiesQuantity; i++) {
            if(this.enemies[i] && !this.enemies[i].mesh) {
                this.enemies.splice(i, 1);
            }
        }
    }

    setupEventListeners() {
        GAME.canvas.addEventListener('click', () => {
            if(this.weapon) {
                this.weapon.fire();
            }
        }, false);
        const positions = [];
        let powerSpeed =0;
        window.addEventListener('keypress', (e) => {
          if (e.keyCode === 32) {
            positions.push(this.cameraPosition)
            console.log(positions.map(p => [round(p.x, 1), round(p.y, 1), round(p.z, 1)]))
          }
          if (e.keyCode === 'u'.charCodeAt(0)) {
            positions.pop();
            console.log(positions.map(p => [round(p.x, 1), round(p.y, 1), round(p.z, 1)]))
          }
          if (e.keyCode === 'p'.charCodeAt(0)) {
            powerSpeed = (powerSpeed + 1) % 6;
            this.camera.speed = powerSpeed * POWER_SPEED + REGULAR_SPEED;
          }
        }, false);
    }

    createHUD() {
        var hud = new UI('levelUI');

        hud.addImage('gunsight', '/assets2/plus-sight.png', {
            'width': 0.05,
            'height': 0.05
        });

        this.lifeTextControl = hud.addText('Life: ' + this.playerLife, {
            'top': '10px',
            'left': '10px',
            'horizontalAlignment': Control.HORIZONTAL_ALIGNMENT_LEFT
        });

        this.ammoTextControl = hud.addText(`Position: x:${round(this.cameraPosition.x, 1)} y:${round(this.cameraPosition.y, 1)} z:${round(this.cameraPosition.z, 1)}`, {
            'top': '10px',
            'left': '10px',
            'horizontalAlignment': Control.HORIZONTAL_ALIGNMENT_CENTER
        });

        this.hitsTextControl = hud.addText('Hits: ' + this.player.hits, {
            'top': '10px',
            'left': '-10px',
            'horizontalAlignment': Control.HORIZONTAL_ALIGNMENT_RIGHT
        });
    }

    createMenu() {
        this.menu = new UI('runnerMenuUI');

        this.pointsTextControl = this.menu.addText('Points: 0', {
            'top': '-200px',
            'outlineWidth': '2px',
            'fontSize': '40px',
            'verticalAlignment': Control.VERTICAL_ALIGNMENT_CENTER
        });

        this.currentRecordTextControl = this.menu.addText('Current Record: 0', {
            'top': '-150px',
            'verticalAlignment': Control.VERTICAL_ALIGNMENT_CENTER
        });

        this.hasMadeRecordTextControl = this.menu.addText('You got a new Points Record!', {
            'top': '-100px',
            'color': GAME.options.recordTextColor,
            'fontSize': '20px',
            'verticalAlignment': Control.VERTICAL_ALIGNMENT_CENTER
        });

        this.gameOverTextControl = this.menu.addText('GAME OVER', {
            'top': '-60px',
            'color': GAME.options.recordTextColor,
            'fontSize': '25px',
            'verticalAlignment': Control.VERTICAL_ALIGNMENT_CENTER
        });

        this.menu.addButton('replayButton', 'Replay Game', {
            'onclick': () => this.replay()
        });

        this.menu.addButton('backButton', 'Return to Home', {
            'top': '70px',
            'onclick': () => GAME.goToLevel('HomeMenuLevel')
        });

        this.menu.hide();
    }

    createCamera() {
      return new Promise((resolve) => {
        var camera = new UniversalCamera("UniversalCamera", new Vector3(-95, 41, -8), this.scene);
        camera.setTarget(new Vector3(-141,70,106));

        camera.attachControl(GAME.canvas, true);

        camera.ellipsoid = new Vector3(0.1, 0.2, 0.1);

        // Reducing the minimum visible FOV to show the Weapon correctly
        camera.minZ = 0;

        // Remap keys to move with WASD
        camera.keysUp = [87, 38]; // W or UP Arrow
        camera.keysDown = [83, 40]; // S or DOWN ARROW
        camera.keysLeft = [65, 37]; // A or LEFT ARROW
        camera.keysRight = [68, 39]; // D or RIGHT ARROW

        camera.inertia = 0.1;
        camera.angularSensibility = 800;
        camera.speed = REGULAR_SPEED;

        camera.onCollide = (collidedMesh) => {
            // If the camera collides with the ammo box
            if(collidedMesh.id == 'ammoBox') {
                this.weapon.reload();
                collidedMesh.dispose();
                collidedMesh.arrow.dispose();
            }
        }

        this.camera = camera;
        resolve();
      })
    }

    playerWasAttacked() {
        this.playerLife -= 5;

        if(this.playerLife <= 0) {
            this.playerLife = 0;
            this.lifeTextControl.text = 'Life: ' + this.playerLife;

            this.gameOver();

            return;
        }

        this.lifeTextControl.text = 'Life: ' + this.playerLife;
        this.assets.getSound('playerDamaged').play();
    }

    playerHitEnemy() {
        this.currentEnemies--;
        this.player.hits++;
        this.hitsTextControl.text = 'Hits: ' + this.player.hits;
    }

    ammoIsOver() {
        // Create a new ammo package that, if collided, recharge the ammo
        this.addAmmoBox();
    }

    addAmmoBox() {
        this.ammoBox = BABYLON.MeshBuilder.CreateBox(
            'ammoBox',
            { 'width': 4, 'height': 2, 'depth': 2 },
            this.scene
        );

        this.ammoBox.position.x = 0;
        this.ammoBox.position.y = 1;
        this.ammoBox.position.z = 0;

        this.ammoBox.checkCollisions = true;

        // Let's add a green arrow to show where is the ammo box
        var arrowSpriteManager = new SpriteManager('arrowSpriteManager','assets/images/arrow.png', 1, 256, this.scene);
        this.ammoBox.arrow = new Sprite('arrow', arrowSpriteManager);
        this.ammoBox.arrow.position.y = 5;
        this.ammoBox.arrow.size = 4;
    }

    updateStats() {
      if (this.lifeTextControl) {
        this.lifeTextControl.text = 'Life: ' + this.playerLife;
      }
      if (this.ammoTextControl) {
        this.ammoTextControl.text = `Position: x:${round(this.cameraPosition.x, 1)} y:${round(this.cameraPosition.y, 1)} z:${round(this.cameraPosition.z, 1)}`;
      }
    }

    gameOver() {
        GAME.pause();

        this.player.stopTimeCounter();
        this.player.calculatePoints();

        this.showMenu();
        this.exitPointerLock();
        this.enemies.forEach(enemy => enemy.remove());
        this.removeUnnecessaryEnemies();

        if(this.ammoBox) {
            this.ammoBox.dispose();
            this.ammoBox.arrow.dispose();
        }

        clearInterval(this.cancelCameraPollerId)
    }

    showMenu() {
        this.pointsTextControl.text = 'Points: ' + this.player.getPoints();
        this.currentRecordTextControl.text = 'Current Record: ' + this.player.getLastRecord();
        this.menu.show();

        if(this.player.hasMadePointsRecord()) {
            this.hasMadeRecordTextControl.isVisible = true;
        } else {
            this.hasMadeRecordTextControl.isVisible = false;
        }
    }

    replay() {
        this.playerLife = 100;
        this.player.hits = 0;

        this.maxEnemies = 10;
        this.currentEnemies = 0;
        this.enemies = [];
        this.enemyDistanceFromCenter = 100;

        this.updateStats();
        GAME.resume();
        this.menu.hide();

        this.camera.position = new Vector3(0, 3.5, 100);
        this.weapon.reload();
        this.addEnemies();

        this.player.startTimeCounter();
    }

    beforeRender() {
        if(!GAME.isPaused() && this.camera) {
            if(this.camera.position.y < -20) {
                this.gameOver();
            }
            this.cameraPosition = this.camera.position.clone();
            this.updateStats();
        }
    }
}