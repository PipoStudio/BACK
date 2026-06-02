import Phaser from 'phaser';
import config from '../config';
import { generateSheep, showMap } from '../utils';
import Button from '../components/button';
import Panel from '../components/panel';
import ImageButton from '../components/imageButton';
import Cloud from '../sprites/Cloud';

export default class extends Phaser.Scene {
  constructor () {
    super({ key: 'GameScene' });
  }
  
  init () {}
  
  preload () {}

  create (params) {
    if (!config.music) {
      config.music = this.sound.add('music', config.musicParams);
      config.music.play();
      config.musicMuted = localStorage[config.localStorageName + '.muted'] === 'true';
      if (config.musicMuted) {
        this.changeMuteState(config.musicMuted);
      }
    }
    this.needBackground = params && params.background;
    this.progress = params && params.progress ? params.progress : -1;
    
    this.gameOver = config.sheepCurrent === config.sheepTotal;
    
    // --- LGICA DE VALIDACIN 15 SEGUNDOS ---
    if (this.gameOver) {
      console.log("Juego terminado. Validando tiempo de juego...");
      const duracionPartida = Math.floor(((new Date()) - config.gameStat.started)/1000);
      
      if (duracionPartida >= 15) {
        this.registrarRachaDeUsuario();
      } else {
        console.log("Partida demasiado corta para registrar racha (dur " + duracionPartida + "s)");
      }
      this.duration = duracionPartida;
    } else {
      this.selectLevelDifficult();
    }
    // ----------------------------------------
    
    showMap(this);
    this.sheep = generateSheep(this, config.sheepCurrent, null, config.gameStat.sheepDelta);
    this.clouds = [];
    for (let i = 0; i < 3; i++) {
      this.clouds.push(new Cloud(this, i + 1));
      this.add.existing(this.clouds[i]);
    }

    const worldView = this.cameras.main.worldView;

    this.time.addEvent({
      delay: 100,
      callback: () => {
        this.muteButton = new ImageButton(this, worldView.left + 60, worldView.top + 60, 80, 80,
          'buttonSquare_brown', config.musicMuted ? 'musicOff' : 'musicOn', () => {this.changeMuteState(!config.musicMuted);}).setAlpha(0);
        this.add.existing(this.muteButton);
        this.muteButton.show();

        this.panel = new Panel(this, worldView.centerX, worldView.bottom - 200, 600, 300);
        this.add.existing(this.panel);

        if (this.gameOver) {
          this.button = new Button(this, worldView.centerX, worldView.top - 100, 300, 120, config.lang.menu, 'buttonLong_brown', () => this.openMenu());
          this.add.existing(this.button);
          this.tweens.add({
            targets: this.button,
            y: worldView.centerY - 200,
            ease: 'Sine.easeOut',
            duration: 1500,
          });
          let scoreLabel = '.high_score';
          if (config.permanentMode) {
            scoreLabel = '.expert_high_score';
          } else if (config.relaxMode) {
            scoreLabel = '.relax_high_score';
          }
          let text = config.lang.score + ': ' + config.score + '\n\n';
          if (config.score > parseInt(localStorage[config.localStorageName + scoreLabel] || 0)) {
            localStorage[config.localStorageName + scoreLabel] = config.score;
            text += config.lang.newHighScore + '!';
          } else {
            text += config.lang.highScore + ': ' + (localStorage[config.localStorageName + scoreLabel] || 0);
          }
          this.panel.show(2, text);
        } else {
          this.button = new Button(this, worldView.centerX, worldView.centerY, 300, 120, config.lang.search, 'buttonLong_brown', () => this.startTour());
          this.button.setAlpha(0);
          this.add.existing(this.button);
          this.tweens.add({
            targets: this.button,
            alpha: 1,
            ease: 'Sine.easeOut',
            duration: 1500,
          });
          this.countPanel = new Panel(this, worldView.right - 220, worldView.top + 85, 400, 125, 'panelInset_brown', '#fff', 30);
          this.add.existing(this.countPanel);
          const text = config.lang.sheep + ': ' + config.sheepCurrent + ' / ' + config.sheepTotal + '\n' + config.lang.score + ': ' + config.score;
          this.countPanel.show(null, text);

          if (config.sheepCurrent === 0) {
            if (config.gameStat.total && config.gameStat.total === config.gameStat.failed) {
              this.panel.show(0, config.lang.intro7);
            } else if (config.permanentMode && config.gameStat.failSequence < config.gameStat.total) {
              this.panel.show(2, config.lang.lostSheep);
            }
          }
        }
      }
    });

    this.backgroundMask = this.add
      .rectangle(0, 0, config.gameOptions.maxWidth, config.gameOptions.maxHeight, 0x000000)
      .setOrigin(0)
      .setAlpha(this.needBackground ? 1 : 0)
      .setScrollFactor(0);

    if (this.needBackground) {
      this.tweens.add({
        targets: [this.backgroundMask],
        alpha: { from: 1, to: 0 },
        ease: 'Sine.easeOut',
        duration: 1000,
        onComplete: () => {}
      });
    }
  }

  // ... (Tus otros mtodos: changeMuteState, selectLevelDifficult, startTour, openMenu siguen igual) ...

  async registrarRachaDeUsuario() {
    try {
      if (typeof window.supabase === 'undefined') {
          console.warn("El cliente global de Supabase no est definido.");
          return;
      }

      const { data: { user } } = await window.supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await window.supabase.rpc('registrar_partida_y_actualizar_racha', {
          user_id_param: user.id
        });
        
        if (error) {
          console.error("Error devuelto por la RPC de Supabase:", error);
          return;
        }
        
        // Actualizacin de la UI
        if (data && data[0]) {
           const streakEl = document.getElementById('streak-counter');
           if (streakEl) streakEl.innerText = data[0].racha_final + " das";
           
           if (data[0].enviar_correo_tipo !== 'NINGUNO') {
             await fetch('https://kuvrszdgljonaxihmkzj.supabase.co/functions/v1/enviar-correo-racha', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ 
                 email: user.email, 
                 tipoRacha: data[0].enviar_correo_tipo 
               })
             });
           }
        }
      }
    } catch (err) {
      console.error("Error crtico al intentar registrar la racha:", err);
    }
  }
}