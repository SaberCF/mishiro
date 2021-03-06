import request, { ProgressInfo } from '../common/request'
import * as fs from 'fs'
import getPath from '../common/get-path'
import configurer from '../common/config'
import { remote } from 'electron'
import { ApiClient } from '../main/client'

let client: ApiClient = remote.getGlobal('client')

let current = 0
let max = 20

function httpGetVersion (resVer: number, progressing: (prog: ProgressInfo) => void): Promise<{ version: number; isExisting: boolean}> {
  const option = {
    // method: 'GET',
    url: `http://storage.game.starlight-stage.jp/dl/${resVer}/manifests/all_dbmanifest`,
    headers: {
      'User-Agent': 'Dalvik/2.1.0 (Linux; U; Android 7.0; Nexus 42 Build/XYZZ1Y)',
      'X-Unity-Version': '5.1.2f1',
      'Accept-Encoding': 'gzip'
    }
  }
  return new Promise((resolve) => {
    request(option, (err) => {
      if (err) {
        resolve({ version: resVer, isExisting: false })
      } else {
        current++
        progressing({ current, max, loading: 100 * current / max })
        resolve({ version: resVer, isExisting: true })
      }
    })
    /* request(option, (err, res) => {
      if (err) {
        resolve({ version: resVer, isExisting: false })
      } else {
        current++
        progressing({ current, max, loading: 100 * current / max })
        if (res.statusCode === 200) {
          resolve({ version: resVer, isExisting: true })
        } else {
          resolve({ version: resVer, isExisting: false })
        }
      }
    }) */
  })
}

async function check (progressing: (prog: ProgressInfo) => void) {
  if (!fs.existsSync(getPath('./data'))) {
    fs.mkdirSync(getPath('./data'))
  }
  let config = remote.getGlobal('config')
  if (config.resVer) {
    return config.resVer
  }
  let res = await client.check()
  if (typeof res === 'number') return res

  let versionFrom = config.latestResVer
  // ipcRenderer.send('api', 'check')
  return new Promise((resolve) => {
    let resVer = versionFrom

    function checkVersion (versionFrom: number) {
      let versionArr = []
      for (let i = 10; i < 210; i += 10) {
        versionArr.push(Number(versionFrom) + i)
      }
      let promiseArr: Promise<{ version: number; isExisting: boolean}>[] = []
      versionArr.forEach((v) => {
        promiseArr.push(httpGetVersion(v, progressing))
      })
      Promise.all(promiseArr).then(async (arr) => {
        max += 20
        let temp = arr
        let isContinue = false
        for (let i = temp.length - 1; i >= 0; i--) {
          if (temp[i].isExisting === true) {
            isContinue = true
            resVer = temp[i].version
            checkVersion(temp[temp.length - 1].version)
            break
          }
        }
        if (!isContinue) {
          configurer.configure('latestResVer', resVer)
          resolve(resVer)
        }
      })
    }
    checkVersion(versionFrom)
  })
}
export default check
