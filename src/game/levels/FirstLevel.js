import { Color3, UniversalCamera, Vector3, Mesh } from '@babylonjs/core'
import { CustomMaterial } from '@babylonjs/materials';
import { Control } from '@babylonjs/gui';

import Enemy from '../Enemy';
import UI from '../../base/UI';
import Weapon from '../Weapon';
import Player from '../Player';
import Level from '../../base/Level';

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

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
        var skybox = BABYLON.MeshBuilder.CreateBox("skyBox", {size: 6375}, this.scene);
        var skyboxMaterial = new BABYLON.StandardMaterial("skyBox", this.scene);
        skyboxMaterial.backFaceCulling = false;
        skyboxMaterial.reflectionTexture = new BABYLON.CubeTexture("assets/skybox/skybox", this.scene);
        skyboxMaterial.reflectionTexture.coordinatesMode = BABYLON.Texture.SKYBOX_MODE;
        skyboxMaterial.disableLighting = true;
        skybox.material = skyboxMaterial;

        this.scene.gravity = new BABYLON.Vector3(0, -9.81, 0);
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

          this.createHUD();
          this.createMenu();

          this.setupEventListeners();

          this.player.startTimeCounter();
          // this.addSomething('hose')
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
        //let ground = BABYLON.Mesh.CreateGround('ground',  5000,  5000, 2, this.scene);


        let groundMaterial = new CustomMaterial('groundMaterial', this.scene);
        groundMaterial.diffuseTexture = new BABYLON.Texture('/assets2/fernie-ground-map-2.png', this.scene);
        // groundMaterial.diffuseTexture.uScale = 1000;
        // groundMaterial.diffuseTexture.vScale = 1000;
        groundMaterial.specularColor = new BABYLON.Color3(0, 0, 0);

        groundMaterial.Fragment_Before_FragColor(`
          // color = mix(color, vec4(0.0,0.,1.,1.),0.3);
          // color = mix(color, vec4(0.4,0.,0.4,1.),0.3);

          vec3 pos = vPositionW*1.5;
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

        `);


        let ground = Mesh.CreateGroundFromHeightMap("ground", "/assets2/fernie-height-map-2.png", 6400, 6400, 300, 0, 500, this.scene, false, resolve);
        ground.checkCollisions = true;
        ground.material = groundMaterial;
      })
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

        this.ammoTextControl = hud.addText('Position: ' + this.cameraPosition, {
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
        var camera = new UniversalCamera("UniversalCamera", new Vector3(-45, 160.3, -10), this.scene);
        camera.setTarget(new Vector3(-80,75,30));

        camera.attachControl(GAME.canvas, true);

        camera.ellipsoid = new Vector3(1.0, 1.7, 1.0);

        // Reducing the minimum visible FOV to show the Weapon correctly
        camera.minZ = 0;

        // Remap keys to move with WASD
        camera.keysUp = [87, 38]; // W or UP Arrow
        camera.keysDown = [83, 40]; // S or DOWN ARROW
        camera.keysLeft = [65, 37]; // A or LEFT ARROW
        camera.keysRight = [68, 39]; // D or RIGHT ARROW

        camera.inertia = 0.1;
        camera.angularSensibility = 800;
        camera.speed = 25;

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
        this.ammoTextControl.text = 'Position: ' + this.cameraPosition;
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
            this.cameraPosition = `x:${round(this.camera.position.x, 1)} y:${round(this.camera.position.y, 1)} z:${round(this.camera.position.z, 1)}`;
            this.updateStats();
        }
    }
}