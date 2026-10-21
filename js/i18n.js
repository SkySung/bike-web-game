// 多語言：所有玩家看得到的文字。t('key', { 變數 }) 取目前語言的字串。
// 字串裡的 [token] 是操作說法，依「鍵盤 / 觸控」換成不同的字（CTL）；{name} 是變數。
// 章節內容與摔車原因在切換語言時直接寫進 CH、REASONS（data.js 只放規則與數值）。

const LANGS = { en: 'English', 'zh-TW': '中文' };
const LANG_KEY = 'balance-way-lang';
let LANG = (() => {
  try { const s = localStorage.getItem(LANG_KEY); if (LANGS[s]) return s; } catch {}
  return /^zh\b/i.test(navigator.language || '') ? 'zh-TW' : 'en';
})();

// ─────────────────────────── 操作說法 ───────────────────────────
const CTL = {
  'zh-TW': {
    keys: {
      R: '按 →', L: '按 ←', holdR: '按住 →', holdL: '按住 ←', holdDir: '按住轉彎方向的鍵',
      pedal: 'A、D 左右交替踩', pedalShort: 'A、D', D: '按 D',
      brakeName: 'S 後煞', brakeHold: '按住 S 後煞', brakeTap: '用 S 一下一下點放煞車', frontName: 'W 前煞',
      foot: '按 F', footName: 'F 放腳', crank: '按 ↑', gearDown: '按 Z', gearUp: '按 X',
      sigL: '按 Q', sigR: '按 E', bellKey: '空白鍵', light: '按 L', mapPos: '右下角', clockPos: '左下角'
    },
    touch: {
      R: '左手往右拖', L: '左手往左拖', holdR: '左手按住往右拖', holdL: '左手按住往左拖', holdDir: '左手往轉彎方向拖',
      pedal: '右手左右交替點', pedalShort: '左右腳', D: '點右腳',
      brakeName: '右下角煞車', brakeHold: '按住右下角煞車', brakeTap: '用右下角煞車一下一下點放', frontName: '前煞',
      foot: '按「放腳」', footName: '「放腳」', crank: '按「轉踏板」', gearDown: '按「輕檔」', gearUp: '按「重檔」',
      sigL: '按「左手勢」', sigR: '按「右手勢」', bellKey: '「鈴」', light: '按「車燈」', mapPos: '左上方', clockPos: '左上方'
    }
  },
  en: {
    keys: {
      R: 'press →', L: 'press ←', holdR: 'hold →', holdL: 'hold ←', holdDir: 'hold the arrow key for the turn',
      pedal: 'tap A and D in turn', pedalShort: 'A and D', D: 'press D',
      brakeName: 'the rear brake (S)', brakeHold: 'hold S', brakeTap: 'tap S on and off', frontName: 'the front brake (W)',
      foot: 'press F', footName: 'F for foot down', crank: 'press ↑', gearDown: 'press Z', gearUp: 'press X',
      sigL: 'press Q', sigR: 'press E', bellKey: 'Space', light: 'press L', mapPos: 'bottom right', clockPos: 'bottom left'
    },
    touch: {
      R: 'drag right with your left thumb', L: 'drag left with your left thumb', holdR: 'drag right and hold', holdL: 'drag left and hold',
      holdDir: 'drag toward the turn', pedal: 'tap left and right in turn', pedalShort: 'left-right taps', D: 'tap Right foot',
      brakeName: 'the brake (bottom right)', brakeHold: 'hold the bottom-right corner', brakeTap: 'tap the brake on and off', frontName: 'the front brake',
      foot: 'tap Foot', footName: 'Foot', crank: 'tap Crank', gearDown: 'tap Low', gearUp: 'tap High',
      sigL: 'tap Signal L', sigR: 'tap Signal R', bellKey: 'Bell button', light: 'tap Light', mapPos: 'top left', clockPos: 'top left'
    }
  }
};

// ─────────────────────────── 字串 ───────────────────────────
const STR = {
  'zh-TW': {
    // 選單與面板
    eyebrow: '腳踏車學騎遊戲', title: '平衡之道',
    lead: '從跌倒到飛馳。每一章學一個真正騎車用得到的技巧，摔車時會用慢動作告訴你原因。',
    chDone: '已通關', chOpen: '開始', chLocked: '先完成上一章',
    chEyebrow: '第 {n} 章．{sub}', goal: '目標：', go: '開始騎', back: '回選單', enter: '（Enter）',
    crashed: '摔車了', violation: '違規了', attempt: '{what}．第 {n} 次', retry: '再試一次', again: '再看重播',
    cleared: '過關！', allCleared: '全部通關！', time: '用時', crashes: '摔車次數', safety: '安全分數',
    tip: '騎車小知識：', next: '下一章', finale: '從扶著後座的第一圈，到雨夜裡自己騎回家。你已經學會騎腳踏車了。',
    paused: '暫停', resume: '繼續', restart: '重來', mute: '靜音', unmute: '開啟音效',
    skip: '跳過重播', skipKey: '跳過重播（Enter）', muted: '已靜音（M 恢復）', soundOn: '已開啟音效',
    keyPedal: '左右腳交替踩', keyLean: '往左／往右傾', keyRear: '後煞', keyFront: '前煞（很猛）', keyFoot: '伸腳落地／停著時蹬地起步',
    keyCrank: '倒轉踏板', keyBell: '鈴鐺', keyPause: '暫停', keyGear: '換輕檔／重檔', keySig: '左轉／右轉手勢', keyLight: '車燈', keySpace: '空白鍵',
    touch1: '左手放在左半邊任何地方，左右拖曳：拖越遠傾越多，放開回正', touch2: '右手在右半邊左右交替點：左腳、右腳踩踏板',
    touch3: '右下角按住（或踩踏的手指往下滑）是後煞', touch4ch: '本章特殊按鈕在右上角；點左上角章節名稱暫停',
    touch4: '每章需要的按鈕會出現在右上角；點左上角章節名稱暫停',
    // 開場提示
    start1: '[pedal]，大約每秒一下就好，爸爸會扶著你',
    start2: '你一腳踩地停著。先看[clockPos]的踏板鐘，[crank]把紅色踏板轉進綠色區，再[D]起步',
    start3: '公園彎道：車身往哪邊傾斜，就會往哪邊轉',
    start4: '郊外丘陵：檔位和坡度在儀表上，上坡前記得換輕檔',
    start5: '從家門口出發，一腳踩地。[D]起步，右上角是安全分數',
    start6: '天黑又下雨，先[light]打開車燈',
    // 儀表
    hudCh: '第 {n} 章　{name}', hudStops: '停車 {n} / 3', hudSafety: '安全分數 {n}', hudLightOn: '車燈 開', hudLightOff: '車燈 關',
    hudLightKey: '（L）', hudBalance: '平衡', hudRhythm: '節奏 ×{n}', hudFootDown: '腳踩地中', hudPedal: '右踏板',
    hudGear: '檔位', hudGearKeys: '（Z 輕 / X 重）', hudGrade: '坡度 {g}%', hudEffort: '踩踏負荷', hudHeat: '煞車溫度', hudStrain: '踩不動！',
    hudReplay: '慢動作重播 ×0.35', signStop: '停', signFinish: '終　點',
    // 觸控
    tbCrank: '轉踏板', tbFoot: '放腳', tbPush: '起步', tbFront: '前煞', tbLow: '輕檔', tbHigh: '重檔',
    tbSigL: '左手勢', tbSigR: '右手勢', tbBell: '鈴 🔔', tbLight: '車燈',
    tzBrake: '按住煞車', tzBraking: '煞車中', tzLeft: '左腳', tzRight: '右腳',
    thumbLean: '左手左右拖：傾斜', thumbPedal: '右手左右交替點：踩踏',
    // 遊戲中的提示
    dadPush: '爸爸扶著你往前推，繼續[pedal]！', sameFoot: '同一隻腳連踩，踏板卡住了！要[pedalShort]左右交替',
    goodStart: '漂亮的起步！踏板在高位，第一腳最有力', lowStart: '踏板在低位，起步沒力又搖晃。停下時[crank]把踏板轉到約 2 點鐘',
    push: '腳往後一蹬，車子動了！趁還沒倒，馬上踩下第一腳', crankMove: '騎行中不用調踏板，停下來再轉',
    lightOn: '車燈打開了，前面的路看得清楚多了', lightOff: '車燈關掉了', pedRung: '行人聽到鈴聲，加快腳步通過了',
    fade: '煞車一直捏著過熱了，越來越煞不住！放開讓它冷卻，改成一下一下點放',
    frontWet: '雨天前煞很容易打滑！改用[brakeName]', frontDry: '前煞很猛！高速時用力按會翻車，主要用[brakeName]',
    gripWet: '雨天輪胎快抓不住了！少傾一點、先減速', gripDry: '太快了，輪胎快抓不住！先減速再轉',
    leanL: '往左倒了！[R]把車扶正', leanR: '往右倒了！[L]把車扶正',
    yardSteer: '車往左倒就[R]、往右倒就[L]，把車扶正', yardRelease: '爸爸偷偷放手了！你自己在騎了！', yardFast: '發現了嗎？騎快一點，車子反而更穩',
    stopNear: '前方停車格：[brakeHold]減速，快停住時[foot]伸腳', stopOk: '第 {n} 次停車成功！起步前先看踏板鐘', stopAll: '三次停車都成功！騎到終點',
    curveR: '前方右彎：[holdR]讓車身往右傾，過完彎就放開', curveL: '前方左彎：[holdL]讓車身往左傾，過完彎就放開',
    sharp: '這是急彎！先用[brakeName]減速', parkIntro: '轉彎靠傾斜：讓車身往轉彎方向傾斜，傾斜越多轉得越急',
    hillUp: '前面上坡 {g}%：[gearDown]換到輕檔（1、2 檔）', hillDown: '前面下坡：[gearUp]換重檔，[brakeTap]控制速度',
    hillStrain: '踩不動了！[gearDown]換輕檔', hillSpin: '檔位太輕，腳在空轉。[gearUp]換重檔',
    hillOver: '超過彎道建議速度 {lim} km/h，[brakeTap]', hillAhead: '前方下坡彎道，建議速度 {lim} km/h，現在開始點放煞車',
    cityYellow: '前面變黃燈了！準備在停止線前停下（[brakeName]、[footName]）', cityGreen: '綠燈了！起步（記得先看踏板鐘）',
    cityPed: '斑馬線有行人！按鈴（[bellKey]）提醒，並減速禮讓', cityPedBad: '經過行人前要先按鈴、放慢（安全分數 −10）', cityPedGood: '按鈴提醒、禮讓行人，做得好！',
    sigHintL: '前面路口左轉：先[sigL]伸左手示意，再傾斜轉彎', sigHintR: '前面路口右轉：先[sigR]伸右手示意，再傾斜轉彎',
    sigOk: '手勢正確！', sigWrongL: '方向打錯了，左轉要[sigL]（安全分數 −5）', sigWrongR: '方向打錯了，右轉要[sigR]（安全分數 −5）',
    sigMiss: '轉彎前忘了打手勢（安全分數 −15）', parkHint: '路邊停車區：往左騎一點，和車子保持一公尺', doorOk: '車門突然打開了，還好你離得夠遠！',
    nightLight: '天黑又下雨，[light]打開車燈！', hzHint: '前面有水窪和人孔蓋：經過時保持直立、不要轉向或煞車，也可以繞開',
    slickLean: '濕滑！傾斜時踩到最危險，快扶正', slickUp: '好滑！保持直立就能穩住',
    ch: [
      {
        name: '五歲．後院', sub: '平衡入門',
        story: '五歲生日那天，你收到第一台腳踏車。爸爸扶著後座說：「別怕，我抓著。」',
        goalText: '騎到後院盡頭的終點（120 公尺）',
        points: ['[pedal]，大約每秒踩一下就能穩定前進', '車往左倒就[R]、往右倒就[L]，把車扶正', '看畫面上方的水平儀，讓泡泡待在中間'],
        card: ['為什麼騎起來就不會倒？', '車子往一邊倒時，把龍頭轉向同一邊，輪子就會跑回你的重心下方，把車扶正。速度越快，這個修正越有效，所以慢慢騎反而最難平衡。']
      },
      {
        name: '起步與停車', sub: '踏板位置、煞車、放腳',
        story: '你已經會騎了，但每次停車都有點狼狽。今天在巷子裡練習好好起步、穩穩停下。',
        goalText: '在 3 個停車格內停好，再騎到終點（175 公尺）',
        points: ['起步前[crank]把右踏板轉到約 2 點鐘，再[D]', '[brakeHold]減速；[frontName]很猛，高速別用力按', '快停住時[foot]伸腳，停在黃色框框裡'],
        card: ['起步的「兩點鐘」法則', '起步前把踏板轉到約兩點鐘方向，第一腳往下踩的行程最長、力量最大，車子一下就有足夠速度保持平衡。停車時先用後煞減速，快停住才伸腳。']
      },
      {
        name: '公園彎道', sub: '傾斜與反向轉向',
        story: '公園的步道彎來彎去。騎車轉彎靠的不只是轉龍頭，更要讓車身傾斜。',
        goalText: '沿著步道騎到終點，別衝進草地',
        points: ['想右轉就[holdR]，車身往右傾就會往右轉；放開就回正（左轉相反）', '彎越急越要先減速，傾斜太多會打滑', '[mapPos]的小地圖會顯示前面的彎道'],
        card: ['反向轉向（counter-steering）', '想往右轉，先把龍頭輕輕往左一帶，車身就會往右倒，接著順著傾斜轉過去。遊戲裡[holdR]時留意前輪：它會先往左一下，再轉向右邊撐住傾斜。騎得比慢跑快的人，幾乎都在不知不覺中這樣做。']
      },
      {
        name: '上坡下坡', sub: '變速與下坡控速',
        story: '今天騎到郊外的丘陵。上坡踩不動、下坡停不住？這一章學會用變速和煞車應付起伏。',
        goalText: '翻過兩座小山丘，騎到終點',
        points: ['上坡前[gearDown]換輕檔（1、2 檔），腳才踩得轉', '平路和下坡[gearUp]換重檔，同樣的踏頻跑得更快', '下坡彎道前看黃色預告牌上的建議速度，[brakeTap]，一直捏著會過熱'],
        card: ['變速怎麼用', '上坡換輕檔（數字小），腳才踩得轉、踏頻不掉；平路和下坡換重檔，同樣的踏頻跑得更快。下坡用「點放」煞車，一直緊捏會讓煞車過熱，越來越煞不住。']
      },
      {
        name: '城市通勤', sub: '紅綠燈、手勢與鈴鐺',
        story: '第一次自己騎車去上學。城市的路上有紅綠燈、行人和路邊停車，要騎得安全，不只是騎得快。',
        goalText: '安全騎到學校，安全分數越高越好',
        points: ['紅燈在停止線前停下（[brakeName]、[footName]），綠燈再起步', '轉彎前打手勢：左轉[sigL]、右轉[sigR]；遇到行人要按鈴（[bellKey]）', '經過路邊停車時往左騎，離車門一公尺'],
        card: ['防禦性騎乘', '和路邊停車保持約一公尺，避開車門突然打開的範圍；轉彎前伸手示意，讓後方的人知道你要去哪；遇到行人先按鈴、放慢，行人永遠優先。']
      },
      {
        name: '雨夜挑戰', sub: '濕滑路面與車燈',
        story: '補習下課，外面下著雨，天也黑了。這是最後的考驗：看得見、也被看見，並且在濕滑的路上穩穩回家。',
        goalText: '在雨夜中平安騎回家',
        points: ['先[light]打開車燈，不然看不清前面的路', '濕地煞車距離變長，前煞很容易打滑，提早用後煞', '經過水窪和人孔蓋時保持直立，不要轉向或煞車'],
        card: ['雨天騎車', '濕地的煞車距離大約是乾地的兩倍，要提早減速；避免在水窪、人孔蓋、白線上轉彎或煞車；夜間一定要開前燈和後燈，讓別人看得見你。']
      }
    ],
    reasons: {
      slow:       ['速度太慢，失去平衡', '車速太慢時，轉龍頭也救不回來。持續用[pedalShort]交替踩踏板保持速度；要停下來時，快停住前先[foot]伸腳。'],
      left:       ['車子往左倒了', '車子往左倒時[R]把車扶回來（真實騎車時，是把龍頭轉向左邊讓輪子回到身體下方）。速度越快，修正越容易。'],
      right:      ['車子往右倒了', '車子往右倒時[L]把車扶回來（真實騎車時，是把龍頭轉向右邊讓輪子回到身體下方）。速度越快，修正越容易。'],
      slip:       ['輪胎抓不住，打滑了', '速度越快，過同一個彎就要傾越多；傾太多輪胎抓地力不夠，車身會開始晃、往外滑。進彎前先用[brakeName]減速，看黃色轉彎牌上的建議速度。'],
      flip:       ['前煞捏太急，翻車了', '高速時猛按前煞，重心往前衝會把你甩出去。先用後煞減速，前煞只輕輕輔助。'],
      foot:       ['高速伸腳，腳被地面拖住', '伸腳落地要等車幾乎停下才做。先煞車，速度降下來再放腳。'],
      overrun:    ['衝過停車格了', '提早[brakeHold]慢慢減速，讓車停在框框裡，再[foot]伸腳。'],
      offroad:    ['衝出路面了', '彎道前提早[holdDir]讓車身傾斜，急彎要先減速。看小地圖可以知道下一個彎往哪邊。'],
      redlight:   ['闖紅燈了', '看到黃燈就要準備停下。在停止線前用[brakeName]、[footName]，等綠燈再起步。'],
      pedestrian: ['撞到行人了', '斑馬線上行人優先。看到行人先按鈴（[bellKey]）提醒，並減速或停下禮讓。'],
      door:       ['撞上路邊的車', '路邊停的車隨時可能開門。經過停車區時往左騎，和車子保持約一公尺，待在車門打開的範圍外。'],
      wetslip:    ['在濕滑處打滑', '水窪、人孔蓋在雨天特別滑，踩上去車身會突然晃一下，抓地力也會暫時變差。經過時保持直立、不要轉向也不要煞車，或乾脆繞開。'],
      wetfront:   ['濕地前煞，前輪打滑', '雨天輪胎抓地力變差，前煞一重就會鎖死打滑。提早用後煞慢慢減速。']
    }
  },

  en: {
    eyebrow: 'A learn-to-ride bike game', title: 'The Way of Balance',
    lead: 'From wobbling to flying. Each chapter teaches one skill real cyclists use, and every crash is replayed in slow motion to show you why it happened.',
    chDone: 'Cleared', chOpen: 'Start', chLocked: 'Clear the previous chapter first',
    chEyebrow: 'Chapter {n} · {sub}', goal: 'Goal: ', go: 'Start riding', back: 'Menu', enter: ' (Enter)',
    crashed: 'Crashed', violation: 'Violation', attempt: '{what} · attempt {n}', retry: 'Try again', again: 'Watch replay',
    cleared: 'Chapter cleared!', allCleared: 'All chapters cleared!', time: 'Time', crashes: 'Crashes', safety: 'Safety score',
    tip: 'Riding tip: ', next: 'Next chapter', finale: 'From Dad holding the seat on your first lap to riding home alone on a rainy night. You can ride a bike now.',
    paused: 'Paused', resume: 'Resume', restart: 'Restart', mute: 'Mute', unmute: 'Sound on',
    skip: 'Skip replay', skipKey: 'Skip replay (Enter)', muted: 'Muted (M to unmute)', soundOn: 'Sound on',
    keyPedal: 'Pedal, left and right in turn', keyLean: 'Lean left / right', keyRear: 'Rear brake', keyFront: 'Front brake (strong)', keyFoot: 'Foot down / push off when stopped',
    keyCrank: 'Turn pedal back', keyBell: 'Bell', keyPause: 'Pause', keyGear: 'Low / high gear', keySig: 'Signal left / right', keyLight: 'Light', keySpace: 'Space',
    touch1: 'Left thumb anywhere on the left half, drag left or right: the further you drag, the more you lean. Let go to straighten up.',
    touch2: 'Right thumb on the right half, tap left and right in turn to pedal.',
    touch3: 'Hold the bottom-right corner (or slide a pedalling finger down) to brake.',
    touch4ch: 'This chapter\'s extra buttons are at the top right. Tap the chapter name at the top left to pause.',
    touch4: 'Each chapter\'s extra buttons appear at the top right. Tap the chapter name at the top left to pause.',
    start1: '[pedal], about once a second. Dad is holding on.',
    start2: 'You are stopped with one foot down. Check the pedal clock at the [clockPos], [crank] to turn the red pedal into the green zone, then [D] to go.',
    start3: 'Park curves: the bike turns whichever way it leans.',
    start4: 'Hill country: your gear and the gradient are on the dashboard. Shift down before each climb.',
    start5: 'Leaving home with one foot down. [D] to set off. Your safety score is at the top right.',
    start6: 'It is dark and raining. First, [light] to turn on your light.',
    hudCh: 'Ch {n}  {name}', hudStops: 'Stops {n} / 3', hudSafety: 'Safety {n}', hudLightOn: 'Light ON', hudLightOff: 'Light OFF',
    hudLightKey: ' (L)', hudBalance: 'Balance', hudRhythm: 'Rhythm ×{n}', hudFootDown: 'Foot down', hudPedal: 'R pedal',
    hudGear: 'Gear', hudGearKeys: ' (Z low / X high)', hudGrade: 'Grade {g}%', hudEffort: 'Effort', hudHeat: 'Brake heat', hudStrain: 'Too hard!',
    hudReplay: 'Slow-motion replay ×0.35', signStop: 'STOP', signFinish: 'FINISH',
    tbCrank: 'Crank', tbFoot: 'Foot', tbPush: 'Push off', tbFront: 'Front brake', tbLow: 'Low', tbHigh: 'High',
    tbSigL: 'Signal L', tbSigR: 'Signal R', tbBell: 'Bell 🔔', tbLight: 'Light',
    tzBrake: 'Hold to brake', tzBraking: 'Braking', tzLeft: 'Left foot', tzRight: 'Right foot',
    thumbLean: 'Left thumb, drag: lean', thumbPedal: 'Right thumb, tap left and right: pedal',
    dadPush: 'Dad is pushing you along. Keep going: [pedal]!', sameFoot: 'Same foot twice and the pedal jams! Alternate: [pedalShort].',
    goodStart: 'Great start! With the pedal high, your first push is the strongest.', lowStart: 'The pedal was low, so the start was weak and wobbly. When stopped, [crank] to bring it to about 2 o\'clock.',
    push: 'You pushed off and the bike is rolling! Pedal now before it tips.', crankMove: 'No need to adjust the pedals while riding. Do it when you stop.',
    lightOn: 'Light on. Now you can see the road ahead.', lightOff: 'Light off.', pedRung: 'The pedestrian heard your bell and hurried across.',
    fade: 'You held the brake so long it overheated and is fading! Let go to cool it, then brake in short taps.',
    frontWet: 'The front brake slips easily in the rain! Use [brakeName] instead.', frontDry: 'The front brake is strong! Grab it hard at speed and you will flip. Mostly use [brakeName].',
    gripWet: 'The tyres are about to slip on the wet road! Lean less and slow down.', gripDry: 'Too fast, the tyres are about to slip! Slow down before you turn.',
    leanL: 'Tipping left! [R] to straighten up.', leanR: 'Tipping right! [L] to straighten up.',
    yardSteer: 'If the bike tips left, [R]. If it tips right, [L].', yardRelease: 'Dad let go! You\'re riding on your own!', yardFast: 'Notice that? The faster you ride, the steadier the bike.',
    stopNear: 'Stopping box ahead: [brakeHold] to slow down, and [foot] when you are almost stopped.', stopOk: 'Stop {n} done! Check the pedal clock before you set off.', stopAll: 'All three stops done! Ride to the finish.',
    curveR: 'Right curve ahead: [holdR] to lean right, and let go after the curve.', curveL: 'Left curve ahead: [holdL] to lean left, and let go after the curve.',
    sharp: 'Sharp curve! Slow down first with [brakeName].', parkIntro: 'You turn by leaning: lean toward the turn, and the more you lean, the tighter you turn.',
    hillUp: 'Climb of {g}% ahead: [gearDown] for a low gear (1 or 2).', hillDown: 'Downhill ahead: [gearUp] for a high gear and [brakeTap] to control your speed.',
    hillStrain: 'Too hard to pedal! [gearDown] for a lower gear.', hillSpin: 'Gear too low, your legs are spinning. [gearUp] for a higher gear.',
    hillOver: 'Over the suggested {lim} km/h for this bend: [brakeTap].', hillAhead: 'Downhill bend ahead, suggested speed {lim} km/h. Start braking in taps now.',
    cityYellow: 'Yellow light ahead! Get ready to stop before the line: brake, then [foot] to put a foot down.', cityGreen: 'Green light! Set off (check the pedal clock first).',
    cityPed: 'Pedestrian on the crossing! Ring the bell ([bellKey]), slow down and let them cross.', cityPedBad: 'Ring and slow down before passing pedestrians (safety −10).', cityPedGood: 'You rang the bell and gave way. Well done!',
    sigHintL: 'Left turn at the junction ahead: [sigL] to signal with your left arm, then lean into the turn.', sigHintR: 'Right turn at the junction ahead: [sigR] to signal with your right arm, then lean into the turn.',
    sigOk: 'Correct signal!', sigWrongL: 'Wrong way! For a left turn, [sigL] (safety −5).', sigWrongR: 'Wrong way! For a right turn, [sigR] (safety −5).',
    sigMiss: 'You forgot to signal before turning (safety −15).', parkHint: 'Parked cars ahead: move left and keep about a metre from them.', doorOk: 'A car door flew open, but you were far enough away!',
    nightLight: 'It is dark and raining. [light] to turn on your light!', hzHint: 'Puddles and manhole covers ahead: stay upright, no turning or braking on them. Or ride around.',
    slickLean: 'Slippery! Hitting it while leaning is the most dangerous. Straighten up!', slickUp: 'Slippery! Stay upright and you will keep control.',
    ch: [
      {
        name: 'Age Five · Backyard', sub: 'Balance basics',
        story: 'On your fifth birthday you got your first bike. Dad holds the back of the seat and says, "Don\'t worry, I\'ve got you."',
        goalText: 'Ride to the end of the backyard (120 m)',
        points: ['[pedal] to pedal. About one tap a second keeps you rolling steadily.', 'If the bike tips left, [R]. If it tips right, [L].', 'Watch the balance bar at the top and keep the bubble in the middle.'],
        card: ['Why does a moving bike stay up?', 'When a bike tips to one side, turning the handlebar the same way steers the wheels back under your weight and rights the bike. The faster you go, the better this works, which is why riding slowly is the hardest way to balance.']
      },
      {
        name: 'Starting and Stopping', sub: 'Pedal position, brakes, foot down',
        story: 'You can ride now, but every stop is a bit clumsy. Today you practise smooth starts and steady stops in the lane.',
        goalText: 'Stop inside all 3 boxes, then ride to the finish (175 m)',
        points: ['Before you start, [crank] to bring the right pedal to about 2 o\'clock, then [D].', '[brakeHold] to slow down with the rear brake. [frontName] is strong, so go easy on it at speed.', 'When you are almost stopped, [foot] to put a foot down inside the yellow box.'],
        card: ['The 2 o\'clock rule', 'Set the pedal at about 2 o\'clock before you start. The first push has the longest stroke and the most power, so the bike quickly gets enough speed to balance. To stop, slow down with the rear brake first and put your foot down only when you are nearly stopped.']
      },
      {
        name: 'Park Curves', sub: 'Leaning and counter-steering',
        story: 'The park path winds back and forth. Turning a bike takes more than turning the handlebar. The bike has to lean.',
        goalText: 'Follow the path to the finish without riding onto the grass',
        points: ['To turn right, [holdR]. The bike leans right and turns right. Let go to straighten up (left works the same way).', 'Slow down more for tighter curves. Lean too far and the tyres slip.', 'The minimap at the [mapPos] shows the curves ahead.'],
        card: ['Counter-steering', 'To turn right, nudge the handlebar slightly left first. The bike falls to the right, and you follow the lean through the turn. In the game, watch the front wheel when you [holdR]: it flicks left for a moment, then turns right to hold the lean. Almost everyone who rides faster than a jog does this without noticing.']
      },
      {
        name: 'Hills', sub: 'Gears and downhill speed',
        story: 'Today you ride out into the hills. Can\'t pedal up, can\'t stop going down? This chapter teaches you to handle the ups and downs with gears and brakes.',
        goalText: 'Cross two small hills and reach the finish',
        points: ['Before a climb, [gearDown] for a low gear (1 or 2) so your legs can keep turning.', 'On flat ground and downhill, [gearUp] for a high gear: the same cadence takes you faster.', 'Before a downhill bend, check the suggested speed on the yellow sign and [brakeTap]. Holding the brake makes it overheat.'],
        card: ['How to use gears', 'Shift to a low gear (small number) for climbs so your legs keep turning. Shift to a high gear on the flat and downhill to go faster at the same cadence. On descents, brake in short taps: squeezing the brake all the way down makes it overheat and fade.']
      },
      {
        name: 'City Commute', sub: 'Traffic lights, signals and the bell',
        story: 'Your first ride to school on your own. City streets have traffic lights, pedestrians and parked cars. Riding safely matters more than riding fast.',
        goalText: 'Get to school safely. The higher your safety score, the better.',
        points: ['At a red light, brake and stop before the line, [foot] to put a foot down, and go on green.', 'Signal before you turn: [sigL] for left, [sigR] for right. Ring the bell for pedestrians ([bellKey]).', 'Move left when passing parked cars and stay about a metre from their doors.'],
        card: ['Defensive riding', 'Keep about a metre from parked cars so a door opening suddenly cannot reach you. Signal with your arm before turning so people behind you know where you are going. Ring and slow down for pedestrians: they always have right of way.']
      },
      {
        name: 'Rainy Night', sub: 'Slippery roads and lights',
        story: 'Cram school is over. It is raining and already dark. The final test: see and be seen, and get home safely on wet roads.',
        goalText: 'Ride home safely through the rainy night',
        points: ['First [light] to turn on your light, or you won\'t see the road ahead.', 'Braking takes longer in the wet and the front brake slips easily. Brake early with the rear brake.', 'Stay upright over puddles and manhole covers: no turning, no braking.'],
        card: ['Riding in the rain', 'On wet roads you need roughly twice the braking distance, so slow down early. Avoid turning or braking on puddles, manhole covers and painted lines. At night, always use front and rear lights so others can see you.']
      }
    ],
    reasons: {
      slow:       ['Too slow to balance', 'At low speed, steering can no longer save you. Keep pedalling ([pedalShort]) to hold your speed, and when you want to stop, [foot] just before you come to a halt.'],
      left:       ['The bike fell to the left', 'When the bike tips left, [R] to bring it back (on a real bike you turn the handlebar left so the wheels get back under you). The faster you go, the easier the correction.'],
      right:      ['The bike fell to the right', 'When the bike tips right, [L] to bring it back (on a real bike you turn the handlebar right so the wheels get back under you). The faster you go, the easier the correction.'],
      slip:       ['The tyres lost grip', 'The faster you go, the more you must lean for the same curve. Lean too far and the tyres can\'t hold: the bike wobbles and slides out. Slow down with [brakeName] before the curve and check the suggested speed on the yellow sign.'],
      flip:       ['Front brake too hard: you flipped', 'Grabbing the front brake hard at speed throws your weight forward over the handlebar. Slow down with the rear brake first and use the front brake only gently.'],
      foot:       ['Foot down too fast', 'Only put your foot down when the bike has nearly stopped. Brake first, then put your foot down once you are slow.'],
      overrun:    ['You rode past the box', '[brakeHold] early to slow down gently with the rear brake, stop inside the box, then [foot].'],
      offroad:    ['You rode off the path', 'Start leaning before the curve ([holdDir]), and slow down for tight ones. The minimap shows which way the next curve goes.'],
      redlight:   ['You ran a red light', 'A yellow light means get ready to stop. Brake, stop before the line, [foot] to put a foot down, and wait for green.'],
      pedestrian: ['You hit a pedestrian', 'Pedestrians have right of way on a zebra crossing. Ring the bell ([bellKey]) to warn them, and slow down or stop to let them cross.'],
      door:       ['You hit a parked car', 'A parked car can open its door at any moment. Move left when passing parked cars and stay about a metre away, outside the door zone.'],
      wetslip:    ['You slipped on a wet patch', 'Puddles and manhole covers are extra slippery in the rain. Riding onto one jolts the bike and briefly costs grip. Stay upright, don\'t turn or brake, or simply ride around.'],
      wetfront:   ['Front brake on a wet road', 'In the rain the tyres grip less, and a firm front brake locks the wheel. Brake early and gently with the rear brake.']
    }
  }
};

// ─────────────────────────── 取字串 ───────────────────────────
function fill(s, vars = {}) {
  const ctl = CTL[LANG][typeof touchShown !== 'undefined' && touchShown ? 'touch' : 'keys'];
  const latin = /[A-Za-z→←↑]/;
  s = s.replace(/\{(\w+)\}/g, (m, k) => vars[k] ?? m).replace(/\[(\w+)\]/g, (m, k, off, src) => {
    let v = ctl[k] ?? m;
    if (LANG === 'zh-TW') {
      // 中文裡夾英文字母或箭頭時前後留一格（標點旁邊不留）：「按 → 把車扶正」「繼續 A、D 交替踩」
      const pre = src[off - 1], post = src[off + m.length];
      if (latin.test(v[0]) && pre && !/[\s（「、，：；]/.test(pre)) v = ' ' + v;
      if (latin.test(v[v.length - 1]) && post && !/[\s）」、，。！；：]/.test(post)) v += ' ';
    }
    return v;
  });
  return LANG === 'en' ? s.replace(/(^|[.!?]\s+)([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s;   // 英文句首大寫
}
function t(key, vars) { return fill(STR[LANG][key] ?? STR['zh-TW'][key] ?? key, vars); }

// 切換語言：章節內容與摔車原因直接寫進 CH、REASONS
function applyLang(lang) {
  if (lang) { LANG = lang; try { localStorage.setItem(LANG_KEY, lang); } catch {} }
  document.documentElement.lang = LANG;
  document.title = STR[LANG].title;
  CH.forEach((c, i) => Object.assign(c, STR[LANG].ch[i]));
  Object.assign(REASONS, STR[LANG].reasons);
}
applyLang();
