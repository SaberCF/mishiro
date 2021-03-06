import ProgressBar from '../../vue/component/ProgressBar.vue'
import TabSmall from '../../vue/component/TabSmall.vue'
import InputText from '../../vue/component/InputText.vue'
import Downloader from './downloader'
import getPath from '../common/get-path'
import * as fs from 'fs'
import * as path from 'path'
import { ipcRenderer, shell, Event } from 'electron'
import { MasterData } from '../main/on-master-read'
import { Vue, Component, Prop } from 'vue-property-decorator'
import { ProgressInfo } from '../common/request'

const dler = new Downloader()
@Component({
  components: {
    ProgressBar,
    TabSmall,
    InputText
  }
})
export default class extends Vue {

  voice: HTMLAudioElement = new Audio()
  queryString: string = ''
  searchResult: any[] = []
  activeCard: any = {}
  activeCardPlus: any = {}
  information: any = {}
  imgProgress: number = 0
  eventCard: any[] = []
  currentPractice: string = 'idol.after'
  practice: { before: string; after: string } = {
    before: 'idol.before',
    after: 'idol.after'
  }

  @Prop({ default: (() => ({})), type: Object }) master!: MasterData

  blood (v: any) {
    switch (v) {
      case 2001:
        return 'A'
      case 2002:
        return 'B'
      case 2003:
        return 'AB'
      case 2004:
        return 'O'
      default:
        return ''
    }
  }

  hand (v: any) {
    switch (v) {
      case 3001:
        return '右'
      case 3002:
        return '左'
      case 3003:
        return '両'
      default:
        return ''
    }
  }

  threesize (v: any) {
    if (!v) return
    if (v[0] === undefined || v[1] === undefined || v[2] === undefined) {
      return ''
    } else if (v[0] >= 1000 && v[1] >= 1000 && v[2] >= 1000) {
      return '？/？/？'
    } else {
      return v[0] + '/' + v[1] + '/' + v[2]
    }
  }

  get table () {
    return [
      [
        { text: this.$t('idol.id') },
        { text: this.information.id },
        { text: this.$t('idol.okurigana') },
        { text: this.information.charaData && this.information.charaData.name_kana }
      ],
      [
        { text: this.$t('idol.card_name') },
        { text: this.information.name },
        { text: this.$t('idol.name') },
        { text: this.information.charaData && this.information.charaData.name }
      ],
      [
        { text: this.$t('idol.chara_id') },
        { text: this.information.chara_id },
        { text: this.$t('idol.age') },
        { text: this.information.charaData && this.information.charaData.age }
      ],
      [
        { text: this.$t('idol.rarity') },
        { text: this.rarity },
        { text: this.$t('idol.height') },
        { text: this.information.charaData && this.information.charaData.height }
      ],
      [
        { text: this.$t('idol.hp'), class: 'hp' },
        { text: this.hp, class: 'hp' },
        { text: this.$t('idol.weight') },
        { text: this.information.charaData && this.information.charaData.weight }
      ],
      [
        { text: this.$t('idol.vocal'), class: 'vocal' },
        { text: this.vocal, class: 'vocal' },
        { text: this.$t('idol.birth') },
        { text: this.information.charaData && (this.information.charaData.birth_month + '月' + this.information.charaData.birth_day + '日') }
      ],
      [
        { text: this.$t('idol.dance'), class: 'dance' },
        { text: this.dance, class: 'dance' },
        { text: this.$t('idol.blood') },
        { text: this.blood(this.information.charaData && this.information.charaData.blood_type) }
      ],
      [
        { text: this.$t('idol.visual'), class: 'visual' },
        { text: this.visual, class: 'visual' },
        { text: this.$t('idol.handedness') },
        { text: this.hand(this.information.charaData && this.information.charaData.hand) }
      ],
      [
        { text: this.$t('idol.solo_live') },
        { text: this.solo },
        { text: this.$t('idol.threesize') },
        { text: this.threesize(this.information.charaData && [this.information.charaData.body_size_1, this.information.charaData.body_size_2, this.information.charaData.body_size_3]) }
      ],
      [
        { text: this.$t('idol.skill_name') },
        { text: this.information.skill && this.information.skill.skill_name },
        { text: this.$t('idol.hometown') },
        { text: this.information.charaData && this.information.charaData.hometown }
      ],
      [
        { text: this.information.skill && this.information.skill.explain, colspan: '2', class: 'text-left' },
        { text: this.$t('idol.constellation'), width: '15%' },
        { text: this.information.charaData && this.information.charaData.seiza }
      ],
      [
        { text: this.$t('idol.leader_skill_name') },
        { text: this.information.leaderSkill && this.information.leaderSkill.name },
        { text: this.$t('idol.voice') },
        { text: this.information.charaData && this.information.charaData.voice }
      ],
      [
        { text: this.information.leaderSkill && this.information.leaderSkill.explain, colspan: '2', class: 'text-left' },
        { text: this.$t('idol.favorite'), width: '15%' },
        { text: this.information.charaData && this.information.charaData.favorite }
      ]
    ]
  }

  get cardData () {
    return this.master.cardData
  }
  get voiceManifest () {
    return this.master.voiceManifest
  }
  get rarity () {
    switch (this.information.rarity) {
      case 1:
        return 'N'
      case 2:
        return 'N+'
      case 3:
        return 'R'
      case 4:
        return 'R+'
      case 5:
        return 'SR'
      case 6:
        return 'SR+'
      case 7:
        return 'SSR'
      case 8:
        return 'SSR+'
      default:
        return ''
    }
  }
  get hp () {
    if (this.information.hp_min && this.information.hp_max && this.information.bonus_hp) {
      return this.information.hp_min + '～' + this.information.hp_max + ' (+' + this.information.bonus_hp + ')'
    } else {
      return ''
    }
  }
  get vocal () {
    if (this.information.vocal_min && this.information.vocal_max && this.information.bonus_vocal) {
      return this.information.vocal_min + '～' + this.information.vocal_max + ' (+' + this.information.bonus_vocal + ')'
    } else {
      return ''
    }
  }
  get dance () {
    if (this.information.dance_min && this.information.dance_max && this.information.bonus_dance) {
      return this.information.dance_min + '～' + this.information.dance_max + ' (+' + this.information.bonus_dance + ')'
    } else {
      return ''
    }
  }
  get visual () {
    if (this.information.visual_min && this.information.visual_max && this.information.bonus_visual) {
      return this.information.visual_min + '～' + this.information.visual_max + ' (+' + this.information.bonus_visual + ')'
    } else {
      return ''
    }
  }
  get solo () {
    if (this.information.solo_live !== undefined) {
      if (Number(this.information.solo_live) === 0) {
        return this.$t('idol.nashi')
      } else {
        return 'お願い！シンデレラ'
      }
    } else {
      return ''
    }
  }

  query () {
    this.searchResult.length = 0
    this.playSe(this.enterSe)
    if (this.queryString) {
      for (let i = 0; i < this.cardData.length; i++) {
        const card = this.cardData[i]
        if (card.name.indexOf('＋') !== card.name.length - 1) {
          const re = new RegExp(this.queryString)
          if (re.test(card.name)) {
            this.searchResult.push(this.cardData[i])
            continue
          }
          if (re.test(card.charaData.name_kana)) {
            this.searchResult.push(this.cardData[i])
            continue
          }
          if (re.test(card.chara_id)) {
            this.searchResult.push(this.cardData[i])
            continue
          }
          if (re.test(card.id)) {
            this.searchResult.push(this.cardData[i])
            continue
          }
        }
      }
    } else {
      this.searchResult = [].concat(this.cardData.filter(card => (Number(card.id) === this.eventCard[0] || Number(card.id) === this.eventCard[1])) as any)
    }
  }
  selectedIdol (card: any) {
    if (Number(this.activeCard.id) !== Number(card.id)) {
      this.playSe(this.enterSe)
      this.activeCard = card
      this.information = card
      for (let i = 0; i < this.cardData.length; i++) {
        if (Number(this.cardData[i].id) === Number(card.id) + 1) {
          this.activeCardPlus = this.cardData[i]
          break
        }
      }

      this.currentPractice = 'idol.before'
      if (navigator.onLine) {
        this.changeBackground(card)
      }
    }
  }
  async changeBackground (card: any) {
    this.imgProgress = 0
    dler.stop()
    if (Number(card.rarity) > 4) {
      if (!fs.existsSync(getPath(`./public/img/card/bg_${card.id}.png`))) {
        try {
          let result = await this.downloadCard(card.id)
          this.imgProgress = 0
          if (result) {
            this.event.$emit('idolSelect', card.id)
          }
        } catch (errorPath) {
          this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.downloadFailed') + '<br/>' + errorPath)
        }
      } else {
        this.event.$emit('idolSelect', card.id)
      }
    } else {
      this.event.$emit('noBg')
    }
  }
  async downloadVoice () {
    this.playSe(this.enterSe)
    if (this.activeCard.charaData.voice) {
      let charaDl = null
      let cardDl = null
      let id = this.currentPractice === 'idol.after' ? this.activeCardPlus.id : this.activeCard.id
      let cid = this.activeCard.chara_id
      let cardVoice = this.voiceManifest.filter(row => row.name === `v/card_${id}.acb`)
      let charaVoice = this.voiceManifest.filter(row => row.name === `v/chara_${cid}.acb`)
      let cardDir = getPath(`./public/asset/sound/voice/card_${id}`)
      let charaDir = getPath(`./public/asset/sound/voice/chara_${cid}`)
      let cardExist = fs.existsSync(cardDir)
      let charaExist = fs.existsSync(charaDir)
      if (!charaExist) {
        fs.mkdirSync(charaDir)
        let hash = charaVoice[0].hash
        try {
          (this.$refs.voiceBtn as HTMLElement).setAttribute('disabled', 'disabled')
          charaDl = await dler.download(
            this.getVoiceUrl(hash),
            getPath(`./public/asset/sound/voice/chara_${cid}/chara_${cid}.acb`),
            prog => { this.imgProgress = prog.loading / 4 }
          )
          this.imgProgress = 25
          // ipcRenderer.send('acb', getPath(`./public/asset/sound/voice/chara_${cid}/chara_${cid}.acb`))
        } catch (errorPath) {
          this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.downloadFailed') + '<br/>' + errorPath)
        }
      }
      if (!cardExist) {
        fs.mkdirSync(cardDir)
        let hash = cardVoice[0].hash
        try {
          // this.$refs.voiceBtn.setAttribute('disabled', 'disabled')
          cardDl = await dler.download(
            this.getVoiceUrl(hash),
            getPath(`./public/asset/sound/voice/card_${id}/card_${id}.acb`),
            prog => { this.imgProgress = prog.loading / 4 + 25 }
          )
          // if (cardDl) {
          this.imgProgress = 50
          // }
        } catch (errorPath) {
          (this.$refs.voiceBtn as HTMLElement).removeAttribute('disabled')
          this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('home.downloadFailed') + '<br/>' + errorPath)
        }
      }

      if (charaDl && cardDl) {
        ipcRenderer.send('voiceDec', [charaDl, cardDl])
      } else if (!charaDl && cardDl) {
        ipcRenderer.send('voiceDec', [cardDl])
      } else if (charaDl && !cardDl) {
        ipcRenderer.send('voiceDec', [charaDl])
      } else {
        if (charaDl === null && cardDl === null) {
          let cardVoiceFiles = fs.readdirSync(cardDir)
          for (let i = 0; i < cardVoiceFiles.length; i++) {
            cardVoiceFiles[i] = path.join(cardDir, cardVoiceFiles[i])
          }
          let charaVoiceFiles = fs.readdirSync(charaDir)
          for (let i = 0; i < charaVoiceFiles.length; i++) {
            charaVoiceFiles[i] = path.join(charaDir, charaVoiceFiles[i])
          }
          let voiceFiles = charaVoiceFiles.concat(cardVoiceFiles)
          this.voice.src = voiceFiles[Math.floor(voiceFiles.length * Math.random())]
          this.voice.play()
        }
      }
    } else {
      this.event.$emit('alert', this.$t('home.errorTitle'), this.$t('idol.noVoice'))
    }
  }
  async downloadCard (id: number | string, progressing?: (prog: ProgressInfo) => void) {
    let downloadResult: string | boolean = false
    downloadResult = await dler.download(
      this.getCardUrl(id),
      getPath(`./public/img/card/bg_${id}.png`),
      (progressing || (prog => { this.imgProgress = prog.loading }))
    )
    return downloadResult
  }
  toggle (practice: string) {
    switch (practice) {
      case 'idol.before':
        this.information = this.activeCard
        if (navigator.onLine) {
          this.changeBackground(this.activeCard)
        }
        break
      case 'idol.after':
        this.information = this.activeCardPlus
        if (navigator.onLine) {
          this.changeBackground(this.activeCardPlus)
        }
        break
      default:
        break
    }
  }
  opendir () {
    this.playSe(this.enterSe)
    if (!fs.existsSync(getPath('./public/img/card'))) {
      fs.mkdirSync(getPath('./public/img/card'))
    }
    shell.openExternal(getPath('./public/img/card'))
  }

  mounted () {
    this.$nextTick(() => {
      this.event.$on('eventBgReady', (id: number) => {
        if (id % 2 === 0) {
          this.currentPractice = 'idol.after'
          for (let i = 0; i < this.cardData.length; i++) {
            if (Number(this.cardData[i].id) === id - 1) {
              this.activeCard = this.cardData[i]
              continue
            }
            if (Number(this.cardData[i].id) === id) {
              this.activeCardPlus = this.cardData[i]
              this.information = this.cardData[i]
              break
            }
          }
        } else {
          this.currentPractice = 'idol.before'
          for (let i = 0; i < this.cardData.length; i++) {
            if (Number(this.cardData[i].id) === id) {
              this.activeCard = this.cardData[i]
              this.information = this.cardData[i]
              continue
            }
            if (Number(this.cardData[i].id) === id + 1) {
              this.activeCardPlus = this.cardData[i]
              break
            }
          }
        }
      })
      this.event.$on('eventRewardCard', (cardId: number[]) => {
        this.eventCard = cardId
        this.searchResult = [].concat(this.cardData.filter(card => (Number(card.id) === cardId[0] || Number(card.id) === cardId[1])) as any)
      })
      this.event.$on('enterKey', (block: string) => {
        if (block === 'idol') {
          this.query()
        }
      })
      ipcRenderer.on('voiceEnd', () => {
        this.imgProgress = 0;
        (this.$refs.voiceBtn as HTMLElement).removeAttribute('disabled')
      })
      ipcRenderer.on('singleHca', (_event: Event, cur: number, total: number) => {
        this.imgProgress = 50 + 50 * cur / total
      })
    })
  }
}
