import { ipcRenderer, shell, Event } from 'electron'
import { Vue, Component, Prop } from 'vue-property-decorator'
import * as fs from 'fs'
import TaskLoading from '../../vue/component/TaskLoading.vue'
import InputText from '../../vue/component/InputText.vue'
import Downloader from './downloader'
import getPath from '../common/get-path'
import { MasterData } from '../main/on-master-read'
const dler = new Downloader()
const scoreDownloader = new Downloader()

@Component({
  components: {
    TaskLoading,
    InputText
  },
  filters: {
    time (second: number) {
      let min: string | number = Math.floor(second / 60)
      let sec: string | number = Math.floor(second % 60)
      if (min < 10) {
        min = '0' + min
      }
      if (sec < 10) {
        sec = '0' + sec
      }
      return `${min}:${sec}`
    }
  }
})
export default class extends Vue {

  queryString: string = ''
  total: number = 0
  current: number = 0
  text: string = ''
  activeAudio: any = {}
  duration: number = 100
  currentTime: number = 0
  allLive: boolean = true
  liveQueryList: any[] = []
  isGameRunning: boolean = false

  @Prop({ default: () => ({}) }) master: MasterData

  get liveManifest () {
    return this.master.liveManifest ? this.master.liveManifest : []
  }
  get bgmManifest () {
    return this.master.bgmManifest ? this.master.bgmManifest : []
  }

  oninput () {
    this.bgm.currentTime = Number((this.$refs.playProg as HTMLInputElement).value)
  }
  async selectAudio (audio: any) {
    if (this.activeAudio.hash !== audio.hash) {
      await this.playSe(this.enterSe)

      this.total = 0
      this.current = 0
      this.text = ''

      if (audio.name.split('/')[0] === 'b') {
        if (!fs.existsSync(getPath(`./public/asset/sound/bgm/${audio.fileName}`))) {
          if (navigator.onLine) {
            dler.stop()
            this.activeAudio = audio
            let result: string | boolean = false
            try {
              result = await dler.download(
                this.getBgmUrl(audio.hash),
                getPath(`./public/asset/sound/bgm/${audio.name.split('/')[1]}`),
                (prog) => {
                  this.text = prog.name as string
                  this.current = prog.loading
                  this.total = prog.loading
                }
              )
            } catch (errorPath) {
              this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.downloadFailed') + '<br/>' + errorPath)
            }
            if (result) {
              this.total = 99.99
              this.current = 99.99
              this.text += this.$t('live.decoding')
              ipcRenderer.send('acb', getPath(`./public/asset/sound/bgm/${audio.name.split('/')[1]}`), `./asset/sound/bgm/${audio.fileName}`)
            }
          } else {
            this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.noNetwork'))
          }
        } else {
          this.activeAudio = audio
          this.event.$emit('liveSelect', { src: `./asset/sound/bgm/${audio.fileName}` })
        }
      } else if (audio.name.split('/')[0] === 'l') {
        if (!fs.existsSync(getPath(`./public/asset/sound/live/${audio.fileName}`))) {
          if (navigator.onLine) {
            dler.stop()
            this.activeAudio = audio
            let result: string | boolean = false
            try {
              result = await dler.download(
                this.getLiveUrl(audio.hash),
                getPath(`./public/asset/sound/live/${audio.name.split('/')[1]}`),
                (prog) => {
                  this.text = prog.name as string
                  this.current = prog.loading
                  this.total = prog.loading
                }
              )
            } catch (errorPath) {
              this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.downloadFailed') + '<br/>' + errorPath)
            }
            if (result) {
              this.total = 99.99
              this.current = 99.99
              this.text += this.$t('live.decoding')
              ipcRenderer.send('acb', getPath(`./public/asset/sound/live/${audio.name.split('/')[1]}`), `./asset/sound/live/${audio.fileName}`)
            }
          } else {
            this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.noNetwork'))
          }
        } else {
          this.activeAudio = audio
          this.event.$emit('liveSelect', { src: `./asset/sound/live/${audio.fileName}` })
        }
      }
    }
  }
  query () {
    this.playSe(this.enterSe)
    if (this.queryString) {
      this.allLive = false
      this.liveQueryList = []
      const re = new RegExp(this.queryString)
      for (let i = 0; i < this.liveManifest.length; i++) {
        if (re.test(this.liveManifest[i].fileName)) {
          this.liveQueryList.push(this.liveManifest[i])
        }
      }
    } else {
      this.allLive = true
      this.liveQueryList = []
    }
  }
  opendir () {
    this.playSe(this.enterSe)
    shell.openExternal(getPath('./public/asset/sound'))
  }
  async startGame () {
    await this.playSe(this.enterSe)

    if (this.isGameRunning) {
      this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('live.gameRunning'))
      return
    }

    if (this.activeAudio.score) {
      if (!fs.existsSync(getPath(`./public/asset/sound/live/${this.activeAudio.fileName}`))) {
        this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('live.noAudio'))
        return
      }
      let isContinue = true
      if (!fs.existsSync(getPath(`./public/asset/score/${this.activeAudio.score}`))) {
        try {
          let scoreBdb = await scoreDownloader.download(
            this.getDbUrl(this.activeAudio.scoreHash),
            getPath(`./public/asset/score/${this.activeAudio.score.split('.')[0]}`)
          )
          if (scoreBdb) {
            this.lz4dec(scoreBdb as string, 'bdb')
            fs.unlinkSync(getPath(`./public/asset/score/${this.activeAudio.score.split('.')[0]}`))
          } else {
            isContinue = false
            this.event.$emit('alert', this.$t('home.errorTitle'), 'Error!')
          }
        } catch (errorPath) {
          isContinue = false
          this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.downloadFailed') + '<br/>' + errorPath)
        }
      }
      if (isContinue) {
        this.event.$emit('game', this.activeAudio)
      }
    } else {
      this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('live.noScore'))
    }
  }

  mounted () {
    this.$nextTick(() => {
      this.bgm.addEventListener('timeupdate', () => {
        this.currentTime = this.bgm.currentTime
      }, false)
      this.bgm.addEventListener('durationchange', () => {
        this.duration = this.bgm.duration
      }, false)
      this.event.$on('playerSelect', (fileName: string) => {
        if (this.bgmManifest.filter(bgm => bgm.fileName === fileName).length > 0) {
          this.activeAudio = this.bgmManifest.filter(bgm => bgm.fileName === fileName)[0]
        } else {
          this.activeAudio = this.liveManifest.filter(bgm => bgm.fileName === fileName)[0]
        }
      })
      this.event.$on('gameStart', () => {
        this.isGameRunning = true
      })
      this.event.$on('enterKey', (block: string) => {
        if (block === 'live') {
          this.query()
        }
      })
      ipcRenderer.on('acb', (_event: Event, url: string) => {
        this.total = 0
        this.current = 0
        this.text = ''
        this.event.$emit('liveSelect', { src: url })
      })
      ipcRenderer.on('liveEnd', (_event: Event, liveResult: any, isCompleted: boolean) => {
        this.isGameRunning = false
        if (isCompleted) this.playSe(new Audio('./asset/sound/se.asar/se_live_wow.mp3'))
        this.event.$emit('showLiveResult', liveResult)
      })
    })
  }
}
