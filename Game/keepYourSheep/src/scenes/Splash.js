import Phaser from 'phaser'
import config from '../config';

export default class extends Phaser.Scene {
  constructor () {
    super({ key: 'SplashScene' })
  }

  preload () {
    this.load.image('medieval_tilesheet', '/juego/assets/images/medieval_tilesheet.png');
    this.load.tilemapTiledJSON('fieldMap', "/juego/assets/maps/map.json");
    this.load.atlasXML('ui', '/juego/assets/images/uipack_rpg_sheet.png', '/juego/assets/images/uipack_rpg_sheet.xml');
    this.load.atlasXML('runes', '/juego/assets/images/rune_sheet.png', '/juego/assets/images/rune_sheet.xml');
    this.load.image('forest_background', '/juego/assets/images/forest_background.png');
    this.load.image('musicOn', '/juego/assets/images/musicOn.png');
    this.load.image('musicOff', '/juego/assets/images/musicOff.png');
    this.load.spritesheet('portraits', '/juego/assets/images/portraits.png', {frameWidth: 32, frameHeight: 32});
    this.load.spritesheet('sheep', '/juego/assets/images/sheep_spritesheet.png', {frameWidth: 16, frameHeight: 16});
    this.load.spritesheet('clouds', '/juego/assets/images/clouds.png', {frameWidth: 400, frameHeight: 166});
    this.load.spritesheet('boom', '/juego/assets/images/boom.png', {frameWidth: 128, frameHeight: 128});
    this.load.audio('music', '/juego/assets/sounds/Red Carpet Wooden Floor.mp3');

    this.percentText = this.make.text({
      x: this.cameras.main.width / 2,
      y: this.cameras.main.height / 2 - 5,
      text: '0%',
      style: {
        fontFamily: '"Press Start 2P"',
        fontSize: '24px',
        fill: '#ffffff'
      }
    });
    this.percentText.setOrigin(0.5, 0.5);
    this.load.on('progress', (value) => {
      this.percentText.setText(parseInt(value * 100) + '%');
    });
  }

  create () {
    this.percentText.destroy();
    this.textures.get('ui').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('portraits').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.textures.get('sheep').setFilter(Phaser.Textures.FilterMode.NEAREST);
    this.scene.start('MainMenuScene');
  }

  update () {}
}
