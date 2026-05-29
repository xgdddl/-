/* ============================================================
   战斗引擎 Combat Engine v1.0
   挂载方式: 酒馆助手 → 状态栏 → 战斗面板
   依赖: TavernHelper API, generateRaw, STATUS_RULES
   ============================================================ */

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 0: 内嵌 STATUS_RULES (精简版, resolveStatus)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function pNum(s) { const m = (s||'').match(/([+-]?\d+)/); return m ? parseInt(m[1]) : 0; }
function pDice(s) { const m = (s||'').match(/(\d*)d(\d+)/i); if (!m) return null; return { count: m[1] ? parseInt(m[1]) : 1, sides: parseInt(m[2]), str: m[0] }; }
function pPct(s) { const m = (s||'').match(/(\d+)%/); return m ? parseInt(m[1]) / 100 : 0; }

const $SK = {
  immunities: [
    { n:"绝对免疫",       r:/绝对免疫|全域免疫/,            e:{all:true} },
    { n:"魔法免疫",       r:/魔法免疫|法术免疫|魔免/,        e:{dt:["spell","magic"]} },
    { n:"物理免疫",       r:/物理免疫|物免/,                e:{dt:["bludg","pierce","slash","physical"]} },
    { n:"火焰免疫",       r:/火焰免疫|火免|免疫火焰/,        e:{dt:["fire"]} },
    { n:"冰霜免疫",       r:/冰霜免疫|冰免|免疫冰霜|免疫寒冷/,  e:{dt:["cold"]} },
    { n:"闪电免疫",       r:/闪电免疫|雷免|免疫闪电/,        e:{dt:["lightning"]} },
    { n:"强酸免疫",       r:/强酸免疫|酸免|免疫强酸|免疫腐蚀/,  e:{dt:["acid"]} },
    { n:"毒素免疫",       r:/毒素免疫|毒免|免疫毒素|免疫中毒/,  e:{dt:["poison"],imS:["中毒"]} },
    { n:"光耀免疫",       r:/光耀免疫|免疫光耀|免疫圣光/,     e:{dt:["radiant"]} },
    { n:"黯蚀免疫",       r:/黯蚀免疫|暗免|免疫黯蚀/,        e:{dt:["necrotic"]} },
    { n:"力场免疫",       r:/力场免疫|免疫力场/,             e:{dt:["force"]} },
    { n:"心灵免疫",       r:/心灵免疫|免疫心灵/,             e:{dt:["psychic"]} },
    { n:"雷鸣免疫",       r:/雷鸣免疫|免疫雷鸣|免疫音波/,     e:{dt:["thunder"]} },
    { n:"控制免疫",       r:/控制免疫|免控|免疫控制|霸体/,    e:{imCC:true} },
    { n:"即死免疫",       r:/即死免疫|免疫即死/,             e:{imDeath:true} },
    { n:"击退免疫",       r:/击退免疫|免疫击退|稳如磐石/,     e:{imPush:true} },
    { n:"恐惧免疫",       r:/恐惧免疫|免疫恐惧|无畏|勇气/,    e:{imS:["恐惧","惊骇"]} },
    { n:"魅惑免疫",       r:/魅惑免疫|免疫魅惑/,             e:{imS:["魅惑","迷惑"]} },
    { n:"中毒未遂",       r:/免疫中毒状态|抗毒体质/,          e:{imS:["中毒"]} },
    { n:"睡眠免疫",       r:/免疫睡眠|不眠/,                e:{imS:["睡眠"]} },
    { n:"疾病免疫",       r:/疾病免疫|免疫疾病/,             e:{imS:["疾病","瘟疫"]} },
    { n:"非魔法物理免疫",  r:/非魔法物理免疫/,                e:{dt:["nmg_bludg","nmg_pierce","nmg_slash"]} },
    { n:"非银武器免疫",    r:/非银武器免疫/,                  e:{dt:["nonsilver"]} },
    { n:"非精金免疫",     r:/非精金武器免疫/,                e:{dt:["nonadam"]} },
    { n:"狂暴免疫",       r:/狂暴免疫|免疫狂暴|理智/,        e:{imS:["狂暴"]} },
  ],
  controls: [
    { n:"眩晕", r:/^眩晕$|眩晕(?!免疫)/,          e:{skip:true,dsDis:true} },
    { n:"麻痹", r:/^麻痹$|麻痹(?!免疫)/,          e:{skip:true,autoCrit:true} },
    { n:"石化", r:/^石化$|石化(?!免疫)/,          e:{skip:true,acB:5,afSave:["str","dex"]} },
    { n:"睡眠", r:/^睡眠$|睡眠(?!免疫)|昏睡/,      e:{skip:true,wakeOnDmg:true} },
    { n:"昏迷", r:/^昏迷$|昏迷(?!免疫)|失去意识/,   e:{skip:true,prone:true,autoCrit:true} },
    { n:"冰封", r:/冰封|冻结|冰冻(?!免疫)/,        e:{skip:true,physVul:1.5} },
    { n:"倒地", r:/^倒地$|倒地(?!免疫)/,          e:{prone:true,mAdv:true,rDis:true} },
    { n:"束缚", r:/^束缚$|束缚(?!免疫)/,          e:{spd0:true,dsDis:true,atkAdv:true} },
    { n:"缠绕", r:/^缠绕$|缠绕(?!免疫)/,          e:{spd0:true,noMove:true,dsDis:true} },
    { n:"擒抱", r:/^擒抱$|擒抱(?!免疫)/,          e:{spd0:true,noMove:true} },
    { n:"失能", r:/^失能$|失能(?!免疫)/,          e:{noAct:true} },
    { n:"禁锢", r:/禁锢|完全束缚|封印/,            e:{noAct:true,noTarget:true} },
    { n:"恐惧", r:/^恐惧$|恐惧(?!免疫)|惊骇/,      e:{noApproach:true,atkDis:true} },
    { n:"魅惑", r:/^魅惑$|魅惑(?!免疫)/,          e:{noAtkCharmer:true} },
    { n:"狂暴", r:/^狂暴$/,                      e:{atkNearest:true,dmgB:1.5} },
    { n:"嘲讽", r:/嘲讽|强制攻击|挑[衅恤]/,        e:{forceTarget:true} },
    { n:"浮空", r:/浮空|升空|被击飞至空中/,        e:{air:true,noMelee:true} },
    { n:"击飞", r:/击飞/,                        e:{knock:true,mayProne:true} },
    { n:"拉拽", r:/拉拽|拖拽/,                    e:{pull:true} },
  ],
  restrictions: [
    { n:"沉默", r:/^沉默$|沉默(?!免疫)|禁言/,      e:{noSpell:true} },
    { n:"缴械", r:/缴械|武器脱手/,                e:{noWeapon:true,fDice:"1d4"} },
    { n:"禁疗", r:/禁疗|禁止治疗/,                e:{noHeal:true} },
    { n:"减疗", r:/减疗\s*(\d+)%/,                x:function(s){ return {healRed:pPct(s)}; } },
    { n:"目盲", r:/^目盲$|目盲(?!免疫)|失明/,      e:{atkDis:true,atkAdv:true} },
    { n:"耳聋", r:/^耳聋$|耳聋(?!免疫)|失聪/,      e:{perDis:true} },
    { n:"防御姿态", r:/防御姿态|防守架势|坚守/,      e:{atkDis:true,acB:2,sAdv:true} },
    { n:"潜伏", r:/潜伏|隐形|隐身(?!术)/,          e:{invis:true,noSingle:true,breakOnAtk:true} },
  ],
  attrMods: [
    { n:"属性+", r:/(力|力量|敏|敏捷|体|体质|智|智力|感|感知|魅|魅力)\s*[+＋]\s*(\d+)/, x:function(s,m){ var a={力:"str",力量:"str",敏:"dex",敏捷:"dex",体:"con",体质:"con",智:"int",智力:"int",感:"wis",感知:"wis",魅:"cha",魅力:"cha"}; var o={}; o.aB={}; o.aB[a[m[1]]]=parseInt(m[2]); o.note=m[1]+"临时+"+m[2]; return o; }},
    { n:"属性-", r:/(力|力量|敏|敏捷|体|体质|智|智力|感|感知|魅|魅力)\s*[-－]\s*(\d+)/, x:function(s,m){ var a={力:"str",力量:"str",敏:"dex",敏捷:"dex",体:"con",体质:"con",智:"int",智力:"int",感:"wis",感知:"wis",魅:"cha",魅力:"cha"}; var o={}; o.aB={}; o.aB[a[m[1]]]=-parseInt(m[2]); o.note=m[1]+"临时-"+m[2]; return o; }},
    { n:"AC+", r:/(?:AC\s*[+＋]\s*(\d+)|[+＋]\s*(\d+)\s*AC)/, x:function(s){ var n=pNum(s); return {acB:n,note:"AC临时+"+n}; }},
    { n:"AC-", r:/(?:AC\s*[-－]\s*(\d+)|[-－]\s*(\d+)\s*AC)/, x:function(s){ var n=pNum(s); return {acB:-n,note:"AC临时-"+n}; }},
    { n:"护盾术",     r:/护盾术|法术护盾/,                   e:{acB:5} },
    { n:"信仰之盾",   r:/信仰之盾|虔诚护盾/,                  e:{acB:2} },
    { n:"法师护甲",   r:/法师护甲|魔法护甲/,                  e:{baseAC:13} },
    { n:"加速",       r:/加速|疾风步|速度提升/,               e:{spdBonus:true,acB:2,dsAdv:true,extraAct:true} },
    { n:"减速",       r:/减速|迟缓术|速度降低/,               e:{spdHalf:true,acPen:2,dsDis:true} },
    { n:"英雄气概",   r:/英雄气概/,                         e:{tmpHP:true,fearImm:true} },
    { n:"防护灵光",   r:/防护灵光|圣光结界/,                  e:{auraSave:true} },
    { n:"庇护所",     r:/庇护所|圣[域所]/,                    e:{sanc:true} },
  ],
  rollMods: [
    { n:"近战优势", r:/近战优势|近战有利/,       e:{mAdv:true} },
    { n:"近战劣势", r:/近战劣势|近战不利/,       e:{mDis:true} },
    { n:"远程优势", r:/远程优势|远程有利/,       e:{rAdv:true} },
    { n:"远程劣势", r:/远程劣势|远程不利|大风|暴风雪|浓烟|迷雾/, e:{rDis:true} },
    { n:"施法优势", r:/施法优势|法术增强/,       e:{spAdv:true} },
    { n:"施法劣势", r:/施法劣势|法术干扰/,       e:{spDis:true} },
    { n:"豁免优势", r:/豁免优势|豁免有利/,       e:{sAdv:true} },
    { n:"豁免劣势", r:/豁免劣势|豁免不利/,       e:{sDis:true} },
    { n:"全域优势", r:/全域优势|幸运|天命加身/,   e:{allAdv:true} },
    { n:"全域劣势", r:/全域劣势|厄运|灾星/,      e:{allDis:true} },
    { n:"祝福",     r:/祝福\((\d*d\d+)\)|祝福\s*[+＋]?\s*(\d*d\d+)/, x:function(s){ var d=pDice(s); return d?{bless:d.str}:null; }},
    { n:"灾祸",     r:/灾祸\((\d*d\d+)\)|灾祸\s*[-－]?\s*(\d*d\d+)/, x:function(s){ var d=pDice(s); return d?{bane:d.str}:null; }},
    { n:"激励",     r:/激励\((\d*d\d+)\)|激励\s*[+＋]?\s*(\d*d\d+)/, x:function(s){ var d=pDice(s); return d?{insp:d.str,oneShot:true}:null; }},
    { n:"暴击率+",  r:/暴击率\s*[+＋]\s*(\d+)|暴击\s*[+＋]\s*(\d+)/, x:function(s){ return {critR:pNum(s)}; }},
    { n:"暴击率-",  r:/暴击率\s*[-－]\s*(\d+)/, x:function(s){ return {critR:-pNum(s)}; }},
    { n:"闪避",     r:/闪避|灵巧|幻影步/,         e:{atkDis:true} },
    { n:"必中",     r:/必中|锁定|绝对命中/,        e:{ignoreDodge:true,ignoreInvis:true} },
    { n:"朦胧术",   r:/朦胧术|模糊身形/,           e:{atkDis:true} },
    { n:"镜影术",   r:/镜影术|分身幻象/,           e:{mirror:3} },
  ],
  reductions: [
    { n:"全域减%",  r:/全域减[免伤]\s*(\d+)%|全减伤\s*(\d+)%/,         x:function(s){ return {allRed:pPct(s)}; }},
    { n:"固定减",   r:/固定减[免伤]\s*(\d+)|免伤[-－]\s*(\d+)/,        x:function(s){ return {flatRed:pNum(s)}; }},
    { n:"物理减%",  r:/物理减[免伤]\s*(\d+)%|物抗\s*(\d+)%/,          x:function(s){ return {tRed:{physical:pPct(s)}}; }},
    { n:"挥砍减%",  r:/挥砍减[免伤]\s*(\d+)%|挥砍抗性\s*(\d+)%/,       x:function(s){ return {tRed:{slashing:pPct(s)}}; }},
    { n:"穿刺减%",  r:/穿刺减[免伤]\s*(\d+)%|穿刺抗性\s*(\d+)%/,       x:function(s){ return {tRed:{piercing:pPct(s)}}; }},
    { n:"钝击减%",  r:/钝击减[免伤]\s*(\d+)%|钝击抗性\s*(\d+)%/,       x:function(s){ return {tRed:{bludgeoning:pPct(s)}}; }},
    { n:"火焰减%",  r:/火焰减[免伤]\s*(\d+)%|火抗\s*(\d+)%|火焰抗性\s*(\d+)%/, x:function(s){ return {tRed:{fire:pPct(s)}}; }},
    { n:"冰霜减%",  r:/冰霜减[免伤]\s*(\d+)%|冰抗\s*(\d+)%|寒冷抗性\s*(\d+)%/, x:function(s){ return {tRed:{cold:pPct(s)}}; }},
    { n:"闪电减%",  r:/闪电减[免伤]\s*(\d+)%|雷抗\s*(\d+)%/,          x:function(s){ return {tRed:{lightning:pPct(s)}}; }},
    { n:"强酸减%",  r:/强酸减[免伤]\s*(\d+)%|酸抗\s*(\d+)%/,          x:function(s){ return {tRed:{acid:pPct(s)}}; }},
    { n:"毒素减%",  r:/毒素减[免伤]\s*(\d+)%|毒抗\s*(\d+)%/,          x:function(s){ return {tRed:{poison:pPct(s)}}; }},
    { n:"光耀减%",  r:/光耀减[免伤]\s*(\d+)%|光耀抗性\s*(\d+)%/,       x:function(s){ return {tRed:{radiant:pPct(s)}}; }},
    { n:"黯蚀减%",  r:/黯蚀减[免伤]\s*(\d+)%|暗抗\s*(\d+)%/,          x:function(s){ return {tRed:{necrotic:pPct(s)}}; }},
    { n:"力场减%",  r:/力场减[免伤]\s*(\d+)%|力场抗性\s*(\d+)%/,       x:function(s){ return {tRed:{force:pPct(s)}}; }},
    { n:"心灵减%",  r:/心灵减[免伤]\s*(\d+)%|心灵抗性\s*(\d+)%/,       x:function(s){ return {tRed:{psychic:pPct(s)}}; }},
    { n:"雷鸣减%",  r:/雷鸣减[免伤]\s*(\d+)%|雷鸣抗性\s*(\d+)%|音波抗性\s*(\d+)%/, x:function(s){ return {tRed:{thunder:pPct(s)}}; }},
    { n:"全法术减%", r:/法术减[免伤]\s*(\d+)%|魔抗\s*(\d+)%|全元素抗性\s*(\d+)%/, x:function(s){ return {spRed:pPct(s)}; }},
  ],
  vulnerabilities: [
    { n:"全域易伤",  r:/全域易伤\s*(\d+)%|脆弱\s*(\d+)%/, x:function(s){ return {allVul:pPct(s)||1.5}; }},
    { n:"物理易伤",  r:/物理易伤|破甲|甲碎/,       e:{tVul:{physical:1.5}} },
    { n:"火焰易伤",  r:/火焰易伤|火弱|怕火/,        e:{tVul:{fire:1.5}} },
    { n:"冰霜易伤",  r:/冰霜易伤|冰弱|怕[寒冻冷]/,  e:{tVul:{cold:1.5}} },
    { n:"闪电易伤",  r:/闪电易伤|雷弱|怕电/,        e:{tVul:{lightning:1.5}} },
    { n:"强酸易伤",  r:/强酸易伤|酸弱/,            e:{tVul:{acid:1.5}} },
    { n:"光耀易伤",  r:/光耀易伤|不死族/,          e:{tVul:{radiant:2.0}} },
    { n:"黯蚀易伤",  r:/黯蚀易伤|暗弱/,            e:{tVul:{necrotic:1.5}} },
    { n:"毒素易伤",  r:/毒素易伤|毒弱/,            e:{tVul:{poison:1.5}} },
    { n:"穿刺易伤",  r:/穿刺易伤|锐器易伤/,         e:{tVul:{piercing:1.5}} },
    { n:"钝击易伤",  r:/钝击易伤|碎骨/,            e:{tVul:{bludgeoning:1.5}} },
    { n:"雷鸣易伤",  r:/雷鸣易伤|音波易伤/,         e:{tVul:{thunder:1.5}} },
  ],
  dots: [
    { n:"流血",     r:/流血\s*(?:\((\d*d\d+)\))?/,  x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d6",dt:"physical"}; }},
    { n:"灼烧",     r:/灼烧\s*(?:\((\d*d\d+)\))?/,  x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d6",dt:"fire"}; }},
    { n:"中毒D",    r:/中毒\s*(?:\((\d*d\d+)\))?/,  x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d4",dt:"poison",dotSv:"con"}; }},
    { n:"酸蚀",     r:/腐蚀\s*(?:\((\d*d\d+)\))?|酸蚀\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d4",dt:"acid"}; }},
    { n:"暗蚀D",    r:/暗影吞噬\s*(?:\((\d*d\d+)\))?|暗蚀\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d6",dt:"necrotic"}; }},
    { n:"瘟疫",     r:/瘟疫\s*(?:\((\d*d\d+)\))?|疫病\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d6",dt:"necrotic",contag:true}; }},
    { n:"腐化",     r:/腐化\s*(?:\((\d*d\d+)\))?|堕落\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d4",dt:"necrotic",healHalf:true}; }},
    { n:"感电",     r:/感电\s*(?:\((\d*d\d+)\))?|雷击余波\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d4",dt:"lightning"}; }},
    { n:"诅咒之痛", r:/诅咒之痛\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d8",dt:"necrotic"}; }},
    { n:"寄生",     r:/寄生\s*(?:\((\d*d\d+)\))?/,  x:function(s){ var d=pDice(s); return {dot:d?d.str:"1d4",dt:"physical",maxHP:true}; }},
    { n:"再生",     r:/再生\s*(?:\((\d*d\d+)\))?|自我修复\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {hot:d?d.str:"1d4"}; }},
    { n:"生命汲取", r:/生命汲取\s*(?:\((\d*d\d+)\))?|吸血光环\s*(?:\((\d*d\d+)\))?/, x:function(s){ var d=pDice(s); return {lifedrain:d?d.str:"1d6"}; }},
  ],
  shields: [
    { n:"护盾·吸收", r:/护盾[·.]吸收\s*(\d+)|护盾\s*(\d+)(?!%)/, x:function(s){ return {sAb:pNum(s)}; }},
    { n:"护盾·HP%",  r:/护盾[·.]百分比\s*(\d+)|护盾[·.]HP\s*(\d+)%/, x:function(s){ return {sPct:pPct(s)}; }},
    { n:"护盾·次数", r:/护盾[·.]次数\s*(\d+)/,                     x:function(s){ return {sChg:pNum(s)}; }},
    { n:"护盾·溢出", r:/护盾[·.]溢出|过量治疗护盾/,                  e:{sOver:true} },
  ],
  reflect: [
    { n:"荆棘",     r:/荆棘\s*(?:\((\d+)\s*%\))?|反伤\s*(?:\((\d+)\s*%\))?/, x:function(s){ return {refPct:pPct(s)||0}; }},
    { n:"固定反伤", r:/固定反伤\s*(\d+)|荆棘光环\s*(\d+)|火盾\s*(\d+)/, x:function(s){ return {refFlat:pNum(s)}; }},
    { n:"魔法反射", r:/魔法反射|法术反弹|法术反转/,       e:{refSpell:true} },
    { n:"溅射",     r:/溅射\s*(?:\((\d+)\s*%\))?/,  x:function(s){ var p=pPct(s)||0.5; return {splash:p}; }},
    { n:"连锁",     r:/连锁\s*(?:\((\d*d\d+)\))?/,  x:function(s){ var d=pDice(s); return {chain:d?d.str:"1d6"}; }},
    { n:"分摊",     r:/分摊|链接|命运共享/,           e:{share:true} },
    { n:"替身",     r:/替身|守护|护卫/,              e:{guard:true} },
  ],
  special: [
    { n:"处决",     r:/处决|斩杀|收割/,              e:{execute:0.2} },
    { n:"穿透N",    r:/穿透\s*(\d+)|穿甲\s*(\d+)/,  x:function(s){ return {arPierce:pNum(s)}; }},
    { n:"减免穿透%", r:/减免穿透\s*(\d+)%/,          x:function(s){ return {redPierce:pPct(s)}; }},
    { n:"弹反",     r:/弹反|反[击制]|格挡反击/,       e:{parry:true} },
    { n:"蓄力",     r:/蓄力|吟唱[中]|聚气|准备中/,    e:{charge:true,nextDmgMult:2.0} },
    { n:"格挡",     r:/格挡|防御|招架(?!反击)/,       e:{block:true,dmgHalf:true} },
    { n:"吸血",     r:/吸血\s*(\d+)%|生命偷取\s*(\d+)%/, x:function(s){ return {lsPct:pPct(s)}; }},
    { n:"专注",     r:/^专注$|集中精神|引导中/,        e:{conc:true} },
    { n:"分身",     r:/分身|幻象|残影/,              e:{clone:true} },
    { n:"标记",     r:/标记|猎人印记|追猎/,           e:{marked:true,markedD:"1d6"} },
    { n:"破绽",     r:/破绽|弱点暴露/,               e:{exposed:true,critVul:true} },
    { n:"元素附着", r:/浸水|浸油|元素附着/,           e:{elemPrime:true} },
    { n:"濒死",     r:/濒死|倒地濒死/,               e:{dying:true,deathSv:{suc:0,fail:0}} },
    { n:"锁血",     r:/锁血|金刚体|不灭|无敌(?!免疫)/, e:{hpLock:1} },
    { n:"复活BUFF", r:/复活|苏生|涅槃|不死鸟/,        e:{autoRev:true,revHP:0.5} },
    { n:"即死",     r:/即死|死亡宣告|灵魂剥离/,        e:{instDeath:true} },
  ],
  resources: [
    { n:"吸蓝", r:/吸蓝\s*(?:\((\d*d\d+)\))?|法力燃烧\s*(?:\((\d+)\))?/, x:function(s){ var d=pDice(s),n=pNum(s); return {mpDrain:d?d.str:(n||0)}; }},
    { n:"过热", r:/过热|冷却延长/, e:{cooldown:true} },
  ],
  exhaustion: [
    { n:"力竭Lv1", r:/力竭\s*(?:Lv\.?\s*)?1|1级力竭/, e:{abDis:true} },
    { n:"力竭Lv2", r:/力竭\s*(?:Lv\.?\s*)?2|2级力竭/, e:{spdHalf:true,abDis:true} },
    { n:"力竭Lv3", r:/力竭\s*(?:Lv\.?\s*)?3|3级力竭/, e:{spdHalf:true,atkDis:true,sDis:true} },
    { n:"力竭Lv4", r:/力竭\s*(?:Lv\.?\s*)?4|4级力竭/, e:{maxHalf:true,spdHalf:true,atkDis:true,sDis:true} },
    { n:"力竭Lv5", r:/力竭\s*(?:Lv\.?\s*)?5|5级力竭/, e:{noMove:true,afAtk:true,afSave:true} },
    { n:"力竭Lv6", r:/力竭\s*(?:Lv\.?\s*)?6|6级力竭/, e:{dead:true} },
  ],
  world: [
    { n:"疾病", r:/^疾病$|患病|感染/, e:{disp:true} },
    { n:"诅咒", r:/^诅咒$|被诅咒/,   e:{disp:true} },
  ],
};

function resolveStatus(name) {
  var s = (name||'').trim(); if (!s) return null;
  var isImm = /免疫/.test(s);
  var cats = [
    {k:"immunities",l:$SK.immunities,p:"preAttack"},
    {k:"controls",l:$SK.controls,p:"preAction"},
    {k:"restrictions",l:$SK.restrictions,p:"preAction"},
    {k:"attrMods",l:$SK.attrMods,p:"preRoll"},
    {k:"rollMods",l:$SK.rollMods,p:"onRoll"},
    {k:"reductions",l:$SK.reductions,p:"onDamage"},
    {k:"vulnerabilities",l:$SK.vulnerabilities,p:"onDamage"},
    {k:"dots",l:$SK.dots,p:"endRound"},
    {k:"shields",l:$SK.shields,p:"onDamage"},
    {k:"reflect",l:$SK.reflect,p:"postDamage"},
    {k:"special",l:$SK.special,p:"onDamage"},
    {k:"resources",l:$SK.resources,p:"endRound"},
    {k:"exhaustion",l:$SK.exhaustion,p:"global"},
    {k:"world",l:$SK.world,p:"display"},
  ];
  for (var ci=0; ci<cats.length; ci++) {
    var cat = cats[ci];
    if (isImm && cat.k !== "immunities") continue;
    for (var ri=0; ri<cat.l.length; ri++) {
      var rule = cat.l[ri];
      var m = s.match(rule.r);
      if (!m) continue;
      var eff = {};
      if (rule.e) eff = JSON.parse(JSON.stringify(rule.e));
      if (rule.x) { var ex = rule.x(s,m); if (ex) Object.assign(eff, ex); }
      return {matched:true, category:cat.k, phase:cat.p, ruleName:rule.n, effect:eff, rawName:s};
    }
  }
  return {matched:false, category:null, phase:"display", ruleName:null, effect:{}, rawName:s, warning:"未识别: "+s};
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 1: 骰子引擎
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function rollD(sides) { return Math.floor(Math.random() * sides) + 1; }

function rollStr(diceStr) {
  // diceStr like "1d8", "2d6", "6d6", "1d4", "d6", "3d8+5"
  var m = diceStr.match(/(\d*)d(\d+)(?:([+-]\d+))?/i);
  if (!m) return { total: 0, dice: [], mod: 0, str: diceStr };
  var count = m[1] ? parseInt(m[1]) : 1;
  var sides = parseInt(m[2]);
  var mod = m[3] ? parseInt(m[3]) : 0;
  var dice = [];
  var total = mod;
  for (var i=0; i<count; i++) { var r=rollD(sides); dice.push(r); total+=r; }
  return { total: total, dice: dice, mod: mod, str: diceStr, count: count, sides: sides };
}

function rollD20(adv, dis) {
  var d1 = rollD(20), d2 = rollD(20);
  if (adv && !dis) return { result: Math.max(d1,d2), roll1: d1, roll2: d2, mode: "advantage" };
  if (dis && !adv) return { result: Math.min(d1,d2), roll1: d1, roll2: d2, mode: "disadvantage" };
  return { result: d1, roll1: d1, roll2: null, mode: "normal" };
}

function attrMod(attrVal) {
  return Math.floor((attrVal - 10) / 2);
}

var PROF_TABLE = { "学徒": 0, "熟手": 1, "巧匠": 2, "大师": 4, "宗师": 6 };

function profBonus(skillLevel) {
  return PROF_TABLE[skillLevel] || 0;
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 1.5: 伤害类型 & 增伤/减免辅助函数
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** 从动作推断伤害类型 */
function resolveDamageType(act) {
  if (act.dmgType) return act.dmgType;
  if (act.type === "spell") {
    var spell = (act.spell || act.skill || act.intent || "").toLowerCase();
    if (/火|炎|燃|灼|焚|flame|fire/i.test(spell)) return "fire";
    if (/冰|霜|寒|冻|frost|ice|cold/i.test(spell)) return "cold";
    if (/电|雷|闪|lightning/i.test(spell)) return "lightning";
    if (/酸|腐蚀|acid|corros/i.test(spell)) return "acid";
    if (/毒|poison|toxic/i.test(spell)) return "poison";
    if (/光|圣|耀|radian|holy|smite/i.test(spell)) return "radiant";
    if (/暗|影|黯|邪|死|necro|shadow/i.test(spell)) return "necrotic";
    if (/力场|魔法飞弹|force|magic.miss/i.test(spell)) return "force";
    if (/心灵|精神|灵能|psychic|mind/i.test(spell)) return "psychic";
    if (/音|鸣|thunder|sonic|boom/i.test(spell)) return "thunder";
    return "magic";
  }
  if (act.weapon) {
    var wep = act.weapon.toLowerCase();
    if (/剑|刀|斧|镰|刃|slash|sword|axe/i.test(wep)) return "slashing";
    if (/矛|枪|箭|弩|刺|匕|弓|pierc|spear|arrow|bow|dart/i.test(wep)) return "piercing";
    if (/锤|棍|杖|棒|拳|爪|bludg|hammer|mace|club|fist/i.test(wep)) return "bludgeoning";
  }
  if (act.type === "ranged") return "piercing";
  return "bludgeoning";
}

function isPhysicalDmg(t) {
  return ["slashing","piercing","bludgeoning","physical"].indexOf(t) >= 0;
}

function getArmorPierce(unit) {
  var maxP = 0;
  (unit.status||[]).forEach(function(st) {
    var r = resolveStatus(st);
    if (r && r.matched && r.effect.arPierce) maxP = Math.max(maxP, r.effect.arPierce);
  });
  return maxP;
}

function getRedPierce(unit) {
  var maxP = 0;
  (unit.status||[]).forEach(function(st) {
    var r = resolveStatus(st);
    if (r && r.matched && r.effect.redPierce) maxP = Math.max(maxP, r.effect.redPierce);
  });
  return maxP;
}

/** 攻击方增伤: 狂暴/蓄力/标记 */
function applyActorDamageBonuses(actor, target, dmg) {
  var actorSts = (actor.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  var targetSts = (target.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  for (var i=0; i<actorSts.length; i++) {
    var e = actorSts[i].effect;
    if (e.dmgB) dmg = Math.floor(dmg * e.dmgB);
    if (e.nextDmgMult) dmg = Math.floor(dmg * e.nextDmgMult);
  }
  for (var j=0; j<targetSts.length; j++) {
    if (targetSts[j].effect.marked && targetSts[j].effect.markedD) {
      dmg += rollStr(targetSts[j].effect.markedD).total;
    }
  }
  return dmg;
}

function consumeChargeStatus(unit) {
  for (var i=0; i<(unit.status||[]).length; i++) {
    var r = resolveStatus(unit.status[i]);
    if (r && r.matched && r.effect.charge) { unit.status.splice(i,1); return true; }
  }
  return false;
}

/** 完整减免管道: 固定→类型%→全域%→法术%  含减免穿透 */
function applyFullReductions(target, dmg, dmgType, act, attacker) {
  var sts = (target.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  var redPierce = attacker ? getRedPierce(attacker) : 0;
  var totalRed = 0;
  var originalDmg = dmg;
  // 1. 固定减免
  for (var i=0; i<sts.length; i++) {
    if (sts[i].effect.flatRed) {
      var fr = Math.floor(sts[i].effect.flatRed * (1 - redPierce));
      dmg = Math.max(0, dmg - fr);
    }
  }
  // 2. 类型减免
  for (var i=0; i<sts.length; i++) {
    var tRed = sts[i].effect.tRed;
    if (!tRed) continue;
    var typePct = tRed[dmgType] || 0;
    if (!typePct && isPhysicalDmg(dmgType)) typePct = tRed.physical || 0;
    if (typePct > 0) {
      var eff = Math.max(0, typePct - redPierce);
      dmg = dmg * (1 - eff);
    }
  }
  // 3. 全域%
  for (var i=0; i<sts.length; i++) {
    if (sts[i].effect.allRed) {
      var eff = Math.max(0, sts[i].effect.allRed - redPierce);
      dmg = dmg * (1 - eff);
    }
  }
  // 4. 法术%
  if (act.type === "spell") {
    for (var i=0; i<sts.length; i++) {
      if (sts[i].effect.spRed) {
        var eff = Math.max(0, sts[i].effect.spRed - redPierce);
        dmg = dmg * (1 - eff);
      }
    }
  }
  totalRed = originalDmg - dmg;
  return { dmg: dmg, totalRed: totalRed };
}

/** 完整易伤管道: 类型易伤→全域→物理 */
function applyFullVulnerabilities(target, dmg, dmgType, act) {
  var sts = (target.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  for (var i=0; i<sts.length; i++) {
    var e = sts[i].effect;
    if (e.tVul) {
      var tv = e.tVul[dmgType] || 0;
      if (!tv && isPhysicalDmg(dmgType)) tv = e.tVul.physical || 0;
      if (tv > 1) dmg = dmg * tv;
    }
    if (e.allVul && e.allVul > 1) dmg = dmg * e.allVul;
    if (e.physVul && e.physVul > 1 && (act.type==="melee"||act.type==="ranged")) dmg = dmg * e.physVul;
  }
  return dmg;
}

/** 处决: 目标HP低于阈值 → 伤害翻倍 */
function applyExecuteCheck(attacker, target, dmg) {
  var atkSts = (attacker.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  for (var i=0; i<atkSts.length; i++) {
    var ex = atkSts[i].effect.execute;
    if (ex && target.hp / target.maxhp <= ex) {
      return { dmg: dmg * 2, executed: true };
    }
  }
  return { dmg: dmg, executed: false };
}

/** 格挡: 伤害减半 */
function applyBlockCheck(target, dmg) {
  var sts = (target.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  for (var i=0; i<sts.length; i++) {
    if (sts[i].effect.block && sts[i].effect.dmgHalf) {
      return { dmg: Math.floor(dmg / 2), blocked: true };
    }
  }
  return { dmg: dmg, blocked: false };
}

function consumeBlockStatus(unit) {
  for (var i=0; i<(unit.status||[]).length; i++) {
    var r = resolveStatus(unit.status[i]);
    if (r && r.matched && r.effect.block) { unit.status.splice(i,1); return true; }
  }
  return false;
}

/** 护盾扩展版: 返回 {remaining, absorbed} */
function applyShieldLogicExtended(unit, dmg) {
  if (unit._shield === undefined) initShields(unit);
  if (unit._shield > 0) {
    var absorbed = Math.min(unit._shield, dmg);
    unit._shield -= absorbed;
    if (unit._shield <= 0) { delete unit._shield; unit.status = unit.status.filter(function(s){ return !/护盾/.test(s); }); }
    return { remaining: dmg - absorbed, absorbed: absorbed };
  }
  if (unit._shieldCharges > 0) {
    unit._shieldCharges--;
    if (unit._shieldCharges <= 0) { delete unit._shieldCharges; unit.status = unit.status.filter(function(s){ return !/护盾/.test(s); }); }
    return { remaining: 0, absorbed: dmg };
  }
  return { remaining: dmg, absorbed: 0 };
}

/** 吸血: 造成伤害的%转化为自身HP */
function applyLifesteal(attacker, finalDmg) {
  var sts = (attacker.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  for (var i=0; i<sts.length; i++) {
    if (sts[i].effect.lsPct) return Math.floor(finalDmg * sts[i].effect.lsPct);
  }
  return 0;
}

/** 反伤: 对攻击者造成反射伤害 */
function applyReflect(target, finalDmg) {
  var sts = (target.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  var total = 0;
  for (var i=0; i<sts.length; i++) {
    var e = sts[i].effect;
    if (e.refPct) total += Math.floor(finalDmg * e.refPct);
    if (e.refFlat) total += e.refFlat;
  }
  return total;
}

/** 弹反: 完全格挡并反击 */
function applyParry(target, attacker, finalDmg) {
  var sts = (target.status||[]).map(function(s){return resolveStatus(s);}).filter(Boolean);
  for (var i=0; i<sts.length; i++) {
    if (sts[i].effect.parry) {
      // 移除弹反状态
      for (var j=0; j<target.status.length; j++) {
        var r = resolveStatus(target.status[j]);
        if (r && r.matched && r.effect.parry) { target.status.splice(j,1); break; }
      }
      // 反击伤害: 武器基础骰 + 力量修正
      var counterDice = rollStr(attacker._lastWeaponDice || "1d6");
      var counterMod = attrMod(attacker.attr.str);
      var counterDmg = Math.max(0, counterDice.total + counterMod);
      attacker.hp = Math.max(0, attacker.hp - counterDmg);
      return { triggered: true, counterDmg: counterDmg };
    }
  }
  return { triggered: false, counterDmg: 0 };
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 2: 战斗状态管理器
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

var Combat = {
  data: null,  // combat_data 变量

  /** 初始化战斗 */
  init: function(units, env, battleName) {
    this.data = {
      active: true,
      round: 0,
      battleName: battleName || "战斗",
      env: env || [],
      initiative: [],
      units: [],
      summary: [],  // [{round:N, text:"...", actions:[...]}]
    };
    this.applyUnits(units);
    this.rollInitiative();
    this.save();
    return this.data;
  },

  /** 加载已有战斗数据 */
  load: function() {
    try {
      this.data = TavernHelper.getVariables("combat_data");
      if (!this.data || !this.data.active) { this.data = null; return null; }
      // 恢复临时盾值
      var self = this;
      this.data.units.forEach(function(u) {
        u._shield = u.__shield || 0;
        u._shieldCharges = u.__shieldCharges || 0;
      });
      return this.data;
    } catch(e) { return null; }
  },

  /** 持久化 */
  save: function() {
    // 临时盾值同步到可序列化字段
    var self = this;
    this.data.units.forEach(function(u) {
      if (u._shield > 0) u.__shield = u._shield;
      else delete u.__shield;
      if (u._shieldCharges > 0) u.__shieldCharges = u._shieldCharges;
      else delete u.__shieldCharges;
    });
    TavernHelper.replaceVariables({ combat_data: this.data });
  },

  /** 添加/更新单位 */
  applyUnits: function(units) {
    var self = this;
    if (!Array.isArray(units)) return;
    units.forEach(function(u) {
      var existing = self.findUnit(u.name || u.id);
      if (existing) {
        Object.assign(existing, u);
      } else {
        self.data.units.push(self.normalizeUnit(u));
      }
    });
  },

  /** 单位标准化（补默认值） */
  normalizeUnit: function(u) {
    var attr = u.attr || {};
    var a = { str: attr.str||10, dex: attr.dex||10, con: attr.con||10, int: attr.int||10, wis: attr.wis||10, cha: attr.cha||10 };
    var conMod = attrMod(a.con);
    var lv = u.level || 1;
    // HP: 用户填了就用户为准，没填自动算 (体调×5 + 10)×等级
    var maxhp = u.maxhp || Math.floor((conMod * 5 + 10) * lv);
    var unit = {
      id: u.name || u.id || ("unit_" + Date.now()),
      name: u.name || "未命名",
      side: u.side || "enemy",
      type: u.type || "creature",
      level: lv,
      hp: (u.hp !== undefined && !isNaN(u.hp) && u.hp > 0) ? u.hp : maxhp,
      maxhp: maxhp,
      tempHP: u.tempHP || 0,
      mp: u.mp || 0,
      maxmp: u.maxmp || 0,
      ac: u.ac || 10,
      attr: a,
      skills: u.skills || {},
      saveProfs: u.saveProfs || [],
      status: u.status || [],
      deathSaves: u.deathSaves || null,
      swarm: u.swarm || null,
      avatar: u.avatar || '',
      initiative: u.initiative || 0,
      _shield: 0,
      _shieldCharges: 0,
    };
    initShields(unit);
    return unit;
  },

  /** 查找单位 */
  findUnit: function(name) {
    if (!this.data) return null;
    for (var i=0; i<this.data.units.length; i++) {
      if (this.data.units[i].name === name || this.data.units[i].id === name) {
        return this.data.units[i];
      }
    }
    return null;
  },

  /** 全单位掷先攻 */
  rollInitiative: function() {
    var self = this;
    this.data.units.forEach(function(u) {
      var r = rollD20(false, false);
      var dexMod = attrMod(u.attr.dex);
      u.initiative = r.result + dexMod;
    });
    // 降序排列
    this.data.units.sort(function(a, b) { return b.initiative - a.initiative; });
    this.data.initiative = this.data.units.map(function(u) { return u.name; });
  },

  /** 检查单位是否免疫某伤害类型 */
  checkImmune: function(unit, dmgType) {
    var resolved = unit.status.map(function(s) { return resolveStatus(s); }).filter(Boolean);
    for (var i=0; i<resolved.length; i++) {
      var eff = resolved[i].effect;
      if (eff.all) return true;
      if (eff.dt && eff.dt.indexOf(dmgType) >= 0) return true;
      // 物理dmgType匹配
      if (eff.dt && eff.dt.indexOf("physical") >= 0 && ["bludgeoning","piercing","slashing","physical"].indexOf(dmgType) >= 0) return true;
    }
    return false;
  },

  /** 结算一个行动 */
  resolveAction: function(act) {
    // act: { actor, target, type, attr, weapon/spell, dice, skill, dmgType, half, area, intent }
    var actor = this.findUnit(act.actor);
    var target = this.findUnit(act.target);
    if (!actor || !target) return { error: "单位未找到", act: act };

    // 解析伤害类型
    var dmgType = resolveDamageType(act);
    var attrMap = { "力":"str","力量":"str","敏":"dex","敏捷":"dex","体":"con","体质":"con","智":"int","智力":"int","感":"wis","感知":"wis","魅":"cha","魅力":"cha" };

    // 检查控制类状态 → actor能否行动
    var actorStatuses = actor.status.map(function(s) { return resolveStatus(s); }).filter(Boolean);
    for (var i=0; i<actorStatuses.length; i++) {
      if (actorStatuses[i].effect.skip || actorStatuses[i].effect.noAct) {
        return { skipped: true, reason: actorStatuses[i].ruleName, act: act };
      }
    }
    // 检查沉默
    if (act.type === "spell") {
      for (var j=0; j<actorStatuses.length; j++) {
        if (actorStatuses[j].effect.noSpell) {
          return { skipped: true, reason: "沉默", act: act };
        }
      }
    }

    // 检查目标免疫
    if (act.type === "spell") {
      if (this.checkImmune(target, "spell") || this.checkImmune(target, "magic")) {
        return { immune: true, reason: "魔法免疫", act: act, damage: 0 };
      }
    }
    // 检查伤害类型免疫
    if (this.checkImmune(target, dmgType)) {
      return { immune: true, reason: dmgType + "免疫", act: act, damage: 0, damageType: dmgType };
    }

    // 获取属性调整值
    var attrKey = act.attr || "力";
    var ak = attrMap[attrKey] || "str";
    if (act.type === "ranged" && !act.attr) ak = "dex";
    var aMod = attrMod(actor.attr[ak]);

    // 获取技能熟练度
    var skillName = act.skill || "";
    var prof = 0;
    if (skillName && actor.skills[skillName]) {
      prof = profBonus(actor.skills[skillName]);
    }

    // 获取优劣势
    var adv = false, dis = false;
    for (var k=0; k<actorStatuses.length; k++) {
      var e = actorStatuses[k].effect;
      if (e.allAdv) adv = true;
      if (e.allDis) dis = true;
      if (act.type === "melee") { if (e.mAdv) adv = true; if (e.mDis) dis = true; }
      if (act.type === "ranged") { if (e.rAdv) adv = true; if (e.rDis) dis = true; }
      if (act.type === "spell") { if (e.spAdv) adv = true; if (e.spDis) dis = true; }
    }
    // 环境效果
    if (this.data.env.length > 0) {
      for (var envI=0; envI<this.data.env.length; envI++) {
        if (/远程|暴风雪|大风|浓烟|迷雾/.test(this.data.env[envI].effect || this.data.env[envI].name)) {
          if (act.type === "ranged") dis = true;
        }
      }
    }

    // 攻击方增益骰 (祝福/灾祸/攻骰+)
    var blessBonus = 0, baneMalus = 0, attBonus = 0;
    for (var bi=0; bi<actorStatuses.length; bi++) {
      var be = actorStatuses[bi].effect;
      if (be.bless) blessBonus += rollStr(be.bless).total;
      if (be.bane) baneMalus += rollStr(be.bane).total;
      if (be.attBonus) attBonus += be.attBonus;
    }
    // 目标方灾祸(影响攻击方)
    var targetStatuses = target.status.map(function(s) { return resolveStatus(s); }).filter(Boolean);
    for (var bj=0; bj<targetStatuses.length; bj++) {
      if (targetStatuses[bj].effect.bane) baneMalus += rollStr(targetStatuses[bj].effect.bane).total;
    }

    // 暴击范围扩展
    var critRange = 1;
    for (var ci=0; ci<actorStatuses.length; ci++) {
      if (actorStatuses[ci].effect.critR) critRange += actorStatuses[ci].effect.critR;
    }
    // 目标破绽 → 暴击范围+1
    for (var cj=0; cj<targetStatuses.length; cj++) {
      if (targetStatuses[cj].effect.exposed) critRange += 1;
    }

    var result = { act: act, actor: actor.name, target: target.name, damageType: dmgType };

    if (act.type === "spell") {
      // 法术: 施法骰 vs 豁免骰
      var spellRoll = rollD20(adv, dis);
      var spellMod = aMod + prof + attBonus + blessBonus - baneMalus;
      var spellTotal = spellRoll.result + spellMod;
      result.spellRoll = { dice: spellRoll, mod: spellMod, total: spellTotal };

      // 豁免: 防御方掷
      var saveAttr = act.save || "敏";
      var saveKey = attrMap[saveAttr] || "dex";
      var tSaveMod = attrMod(target.attr[saveKey]);
      if (target.saveProfs && target.saveProfs.indexOf(saveKey) >= 0) {
        tSaveMod += profBonus("巧匠");
      }
      // 目标豁免修正 (dcBonus 对本法术, saveBonus 对豁免方)
      var tSaveBonus = 0;
      for (var si=0; si<targetStatuses.length; si++) {
        var se = targetStatuses[si].effect;
        if (se.saveBonus) tSaveBonus += se.saveBonus;
      }

      var tAdv = false, tDis = false;
      for (var sj=0; sj<targetStatuses.length; sj++) {
        if (targetStatuses[sj].effect.sAdv) tAdv = true;
        if (targetStatuses[sj].effect.sDis) tDis = true;
      }

      var saveRoll = rollD20(tAdv, tDis);
      var saveTotal = saveRoll.result + tSaveMod + tSaveBonus;
      result.saveRoll = { dice: saveRoll, mod: tSaveMod + tSaveBonus, total: saveTotal };

      var dmgRoll = rollStr(act.dice || "0");
      result.damageRoll = dmgRoll;

      if (saveTotal >= spellTotal) {
        result.hit = "saved";
        result.damage = act.half ? Math.floor(dmgRoll.total / 2) : 0;
      } else {
        result.hit = "failed";
        result.damage = dmgRoll.total;
      }

    } else {
      // 物理/远程: 攻击骰 vs AC
      var atkRoll = rollD20(adv, dis);
      var atkModTotal = aMod + prof + attBonus + blessBonus - baneMalus;
      var atkTotal = atkRoll.result + atkModTotal;
      result.attackRoll = { dice: atkRoll, mod: atkModTotal, prof: prof, blessBonus: blessBonus, baneMalus: baneMalus, total: atkTotal };

      // 有效AC - 穿甲
      var pierceAC = getArmorPierce(actor);
      var effAC = this.effectiveAC(target) - pierceAC;
      result.effectiveAC = effAC;

      // 暴击判定 (含暴击范围扩展)
      var isCrit = atkRoll.result >= (21 - critRange);
      if (atkTotal >= effAC) {
        result.ac = effAC;
        result.hit = isCrit ? "crit" : "hit";
        var dmg = rollStr(act.dice || "1d4");
        dmg.total += aMod;
        dmg.mod = aMod;
        if (isCrit) {
          dmg.total = dmg.total * 2 - aMod;
          dmg.crit = true;
        }
        result.damageRoll = dmg;
        result.damage = Math.max(0, dmg.total);
      } else {
        result.hit = "miss";
        result.damage = 0;
      }
    }

    // ═══════════ 完整伤害计算管道 ═══════════
    if (result.damage > 0) {
      var dmg = result.damage;

      // 阶段1: 攻击方增伤 (狂暴/蓄力/标记)
      dmg = applyActorDamageBonuses(actor, target, dmg);
      if (consumeChargeStatus(actor)) result.chargeConsumed = true;

      // 阶段2: 集群修正
      dmg = applySwarmModifiers(target, act, dmg);

      // 阶段3: 目标减免 (固定→类型%→全域%→法术%, 含穿透)
      var redResult = applyFullReductions(target, dmg, dmgType, act, actor);
      dmg = redResult.dmg;
      if (redResult.totalRed > 0) result.totalReduction = redResult.totalRed;

      // 阶段4: 护盾吸收
      var shieldResult = applyShieldLogicExtended(target, dmg);
      dmg = shieldResult.remaining;
      if (shieldResult.absorbed > 0) result.shieldAbsorbed = shieldResult.absorbed;

      // 阶段5: 目标易伤 (类型→全域→物理)
      dmg = applyFullVulnerabilities(target, dmg, dmgType, act);

      // 阶段6: 处决 (HP阈值翻倍)
      var execResult = applyExecuteCheck(actor, target, dmg);
      dmg = execResult.dmg;
      if (execResult.executed) result.executed = true;

      // 阶段7: 格挡 (伤害减半)
      var blockResult = applyBlockCheck(target, dmg);
      dmg = blockResult.dmg;
      if (blockResult.blocked) {
        result.blocked = true;
        consumeBlockStatus(target);
      }

      result.finalDamage = Math.max(0, Math.floor(dmg));
    } else {
      result.finalDamage = 0;
    }

    // 扣HP
    if (result.finalDamage > 0) {
      if (target.tempHP > 0) {
        var tmpAbsorb = Math.min(target.tempHP, result.finalDamage);
        target.tempHP -= tmpAbsorb;
        result.finalDamage -= tmpAbsorb;
        result.tempAbsorbed = tmpAbsorb;
      }
      target.hp = Math.max(0, target.hp - result.finalDamage);
      result.hpAfter = target.hp + "/" + target.maxhp;

      // 吸血
      var lsHeal = applyLifesteal(actor, result.finalDamage);
      if (lsHeal > 0) {
        actor.hp = Math.min(actor.maxhp, actor.hp + lsHeal);
        result.lifestealHeal = lsHeal;
      }

      // 反伤
      var reflectDmg = applyReflect(target, result.finalDamage);
      if (reflectDmg > 0) {
        actor.hp = Math.max(0, actor.hp - reflectDmg);
        result.reflectDamage = reflectDmg;
      }

      // 弹反
      var parryResult = applyParry(target, actor, result.finalDamage);
      if (parryResult.triggered) {
        result.parried = true;
        result.parryDamage = parryResult.counterDmg;
        // 弹反成功，目标不受伤
        target.hp = Math.min(target.maxhp, target.hp + result.finalDamage);
        result.finalDamage = 0;
      }
    }

    // 检查死亡/濒死
    if (target.hp <= 0) {
      if (target.deathSaves) {
        var dsRoll = rollD20(false, false);
        if (dsRoll.result >= 10) {
          target.deathSaves.success++;
          result.deathSave = { roll: dsRoll.result, result: "success", total: target.deathSaves.success };
        } else {
          target.deathSaves.failure++;
          result.deathSave = { roll: dsRoll.result, result: "failure", total: target.deathSaves.failure };
        }
        if (target.deathSaves.success >= 3) {
          target.hp = 1;
          target.deathSaves = null;
          result.deathSave.stabilized = true;
        } else if (target.deathSaves.failure >= 3) {
          target.deathSaves = { success: 0, failure: 0 };
          result.deathSave.dead = true;
          result.killed = true;
        }
      } else if (target.status.some(function(st){ return /濒死/.test(st); })) {
        target.deathSaves = { success: 0, failure: 0 };
        var ds2 = rollD20(false, false);
        if (ds2.result >= 10) {
          target.deathSaves.success++;
          result.deathSave = { roll: ds2.result, result: "success", total: 1 };
        } else {
          target.deathSaves.failure++;
          result.deathSave = { roll: ds2.result, result: "failure", total: 1 };
        }
      } else {
        result.killed = true;
      }
    }

    return result;
  },

  /** @deprecated 使用独立函数 applyFullReductions */
  applyReductions: function(unit, dmg, act) {
    var dmgType = resolveDamageType(act);
    return applyFullReductions(unit, dmg, dmgType, act, null).dmg;
  },

  /** 计算最终 AC (含状态修正, 不含穿甲——穿甲在resolveAction中处理) */
  effectiveAC: function(unit) {
    var ac = unit.ac;
    var statuses = unit.status.map(function(s) { return resolveStatus(s); }).filter(Boolean);
    for (var i=0; i<statuses.length; i++) {
      var e = statuses[i].effect;
      if (e.acB) ac += e.acB;
      if (e.acPen) ac -= e.acPen;
      if (e.baseAC && e.baseAC > ac) ac = e.baseAC; // 法师护甲: 基础AC=13（取高）
    }
    return ac;
  },

  /** @deprecated 使用独立函数 applyFullVulnerabilities */
  applyVulnerabilities: function(unit, dmg, act) {
    var dmgType = resolveDamageType(act);
    return applyFullVulnerabilities(unit, dmg, dmgType, act);
  },

  /** 结束战斗 */
  end: function() {
    var summary = this.buildSummary();
    this.data.active = false;
    this.save();
    // 输出到聊天
    this.sendToChat(summary);
    // 清空
    TavernHelper.deleteVariable("combat_data");
    this.data = null;
    return summary;
  },

  /** 构建摘要 */
  buildSummary: function() {
    var lines = [];
    lines.push("[战斗结束·" + this.data.round + "回合] " + this.data.battleName);

    var allyStatus = [], enemyStatus = [];
    this.data.units.forEach(function(u) {
      var prefix = u.hp <= 0 ? "💀 " : "";
      var line = prefix + u.name + " HP " + u.hp + "/" + u.maxhp;
      if (u.hp > 0 && u.status.length > 0) line += " [" + u.status.join(",") + "]";
      if (u.side === "ally") allyStatus.push(line);
      else enemyStatus.push(line);
    });
    if (allyStatus.length > 0) lines.push("友方: " + allyStatus.join("; "));
    if (enemyStatus.length > 0) lines.push("敌方: " + enemyStatus.join("; "));

    // 环境
    if (this.data.env.length > 0) {
      lines.push("环境: " + this.data.env.map(function(e) { return e.name; }).join("、"));
    }

    // 回合摘要
    if (this.data.summary.length > 0) {
      lines.push("各回合摘要:");
      this.data.summary.forEach(function(s) {
        lines.push("  R" + s.round + ": " + s.text);
      });
    }

    return lines.join("\n");
  },

  /** 发送终结摘要到聊天 */
  sendToChat: function(summary) {
    TavernHelper.createChatMessages([{
      role: "user",
      message: summary
    }]);
  },
};


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 3: CombatAPI — 独立API + 叙事生成
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

var CombatAPI = {
  presets: [],
  active: null,
  apiMode: 'follow',
  injectMode: 'message',

  loadSettings: function() {
    try {
      var saved = TavernHelper.getVariables("combat_api_settings");
      if (saved) {
        this.presets = saved.presets || [];
        this.active = saved.active || null;
        this.apiMode = saved.apiMode || 'follow';
        this.injectMode = saved.injectMode || 'message';
      }
    } catch(e) {}
  },

  saveSettings: function() {
    TavernHelper.replaceVariables({
      combat_api_settings: {
        presets: this.presets,
        active: this.active,
        apiMode: this.apiMode,
        injectMode: this.injectMode
      }
    });
  },

  getActiveConfig: function() {
    if (!this.active) return null;
    for (var i = 0; i < this.presets.length; i++) {
      if (this.presets[i].name === this.active) return this.presets[i];
    }
    return null;
  },

  async narrate(combatData, roundResults, summaryText) {
    if (this.apiMode !== 'separate') return null;
    var config = this.getActiveConfig();
    if (!config || !config.apiUrl) return null;
    var prompt = buildNarrationPrompt(combatData, roundResults, summaryText);
    try {
      var response = await TavernHelper.generateRaw({
        user_input: prompt,
        should_silence: true,
        max_chat_history: 0,
        custom_api: {
          apiurl: config.apiUrl,
          key: config.apiKey || '',
          source: config.apiSource || '',
          model: config.model || '',
          proxy_preset: config.proxyPreset || ''
        }
      });
      return typeof response === "string" ? response : (response && response.text) || String(response);
    } catch(e) { return null; }
  },

  addPreset: function(name, cfg) {
    this.presets.push({ name: name, apiUrl: cfg.apiUrl || '', apiKey: cfg.apiKey || '', apiSource: cfg.apiSource || '', model: cfg.model || '', proxyPreset: cfg.proxyPreset || '' });
    this.saveSettings();
  },

  removePreset: function(name) {
    this.presets = this.presets.filter(function(p) { return p.name !== name; });
    if (this.active === name) this.active = this.presets.length > 0 ? this.presets[0].name : null;
    this.saveSettings();
  },

  setActive: function(name) { this.active = name; this.saveSettings(); },
  setApiMode: function(mode) { this.apiMode = mode; this.saveSettings(); },
  setInjectMode: function(mode) { this.injectMode = mode; this.saveSettings(); }
};

function buildNarrationPrompt(combatData, roundResults, summaryText) {
  var lines = [];
  lines.push("你是战斗叙事引擎。基于以下战斗数据，用生动的中文描述这一回合的战斗过程。");
  lines.push("");
  lines.push("【当前战斗状态】");
  lines.push("战斗: " + combatData.battleName + " | 回合: " + combatData.round);
  combatData.units.forEach(function(u) {
    if (u.hp <= 0) return;
    var sideLabel = u.side === "ally" ? "友方" : (u.side === "enemy" ? "敌方" : "中立");
    lines.push("- " + u.name + " (" + sideLabel + ") Lv." + u.level + " HP" + u.hp + "/" + u.maxhp + " AC" + u.ac);
    if (u.status && u.status.length > 0) lines.push("  状态: " + u.status.join(", "));
  });
  if (combatData.env && combatData.env.length > 0) {
    lines.push("环境: " + combatData.env.map(function(e) { return e.name; }).join("、"));
  }
  lines.push("");
  lines.push("【本回合动作摘要】");
  lines.push(summaryText);
  lines.push("");
  lines.push("【要求】紧凑、有画面感，约100-200字，包含数值，描述状态变化，不添加标记或XML标签，只输出叙事文本。");
  return lines.join("\n");
}

function buildTemplateSummary(roundResults, data) {
  var parts = [];
  parts.push("══ 回合 " + data.round + " ══");
  roundResults.forEach(function(r) {
    if (r.error) { parts.push("❌ " + r.act.actor + " 错误: " + r.error); }
    else if (r.skipped) { parts.push("⏭ " + r.act.actor + " 跳过(" + r.reason + ")"); }
    else if (r.immune) { parts.push("🛡 " + r.target + " 免疫" + (r.damageType || "攻击")); }
    else if (r.hit === "miss") { parts.push("💨 " + r.actor + " → " + r.target + " 未命中"); }
    else if (r.killed) { parts.push("💀 " + r.actor + " 击杀 " + r.target); }
    else if (r.damage > 0) {
      var detail = r.hit === "crit" ? "💥暴击! " : (r.hit === "saved" ? "🔰豁免 " : "");
      var extras = [];
      if (r.chargeConsumed) extras.push("蓄力释放");
      if (r.executed) extras.push("处决");
      if (r.blocked) extras.push("格挡减半");
      if (r.lifestealHeal) extras.push("吸血+" + r.lifestealHeal);
      if (r.reflectDamage) extras.push("反伤-" + r.reflectDamage);
      if (r.parried) extras.push("被弹反");
      var extraStr = extras.length > 0 ? " [" + extras.join(",") + "]" : "";
      parts.push(detail + r.actor + " → " + r.target + " " + r.finalDamage + "伤" + extraStr + " (HP" + (r.hpAfter || "?") + ")");
    }
  });
  return parts.join("\n");
}

function buildDetailedFlow(roundResults) {
  var lines = [];
  roundResults.forEach(function(r, idx) {
    if (idx > 0) lines.push("─".repeat(40));
    lines.push("【" + (idx+1) + "】" + (r.actor||"?") + " → " + (r.target||"?"));
    if (r.error) { lines.push("错误: " + r.error); return; }
    if (r.skipped) { lines.push("跳过: " + r.reason); return; }
    if (r.immune) { lines.push("免疫: " + (r.damageType||"攻击")); return; }

    if (r.spellRoll) {
      lines.push("施法骰: " + r.spellRoll.dice.result + " + " + r.spellRoll.mod + " = " + r.spellRoll.total);
      if (r.saveRoll) lines.push("豁免骰: " + r.saveRoll.dice.result + " + " + r.saveRoll.mod + " = " + r.saveRoll.total);
      lines.push("判定: " + (r.hit === "saved" ? "豁免成功" : "豁免失败"));
    } else if (r.attackRoll) {
      var critInfo = r.hit === "crit" ? " 💥暴击" : "";
      lines.push("攻击骰: " + r.attackRoll.dice.result + " + " + r.attackRoll.mod + " = " + r.attackRoll.total);
      lines.push("AC判定: " + r.attackRoll.total + " ≥ " + (r.effectiveAC||"?") + " → " + (r.hit === "miss" ? "❌未中" : "✅命中") + critInfo);
    }

    if (r.hit !== "miss") {
      if (r.damageRoll) lines.push("伤害骰: " + (r.damageRoll.str||"") + " → " + r.damage);
      if (r.totalReduction) lines.push("减免: -" + Math.round(r.totalReduction));
      if (r.shieldAbsorbed) lines.push("护盾吸收: " + r.shieldAbsorbed);
      lines.push("类型: " + (r.damageType||"?"));
      lines.push("最终伤害: " + r.finalDamage);
    }
  });
  return lines.join("\n");
}

function buildSettlementTable(roundResults, data) {
  var lines = [];
  lines.push("══ 回合 " + data.round + " 结算 ══");
  lines.push("");

  // Per-unit HP changes
  var unitChanges = {};
  data.units.forEach(function(u) { unitChanges[u.name] = { before: u._hpBefore || u.hp, after: u.hp, dead: u.hp <= 0 }; });

  lines.push("| 攻击方 | 目标 | 伤害 | 最终HP |");
  lines.push("|--------|------|------|--------|");
  roundResults.forEach(function(r) {
    if (r.error || r.skipped || r.immune) return;
    lines.push("| " + (r.actor||"?") + " | " + (r.target||"?") + " | " +
      (r.hit==="miss"?"未命中":(r.finalDamage||0)) + " | " + (r.hpAfter||"?") + " |");
  });

  // DOT/HOT summary
  data.units.forEach(function(u) {
    if (u.hp <= 0 || u._dead) return;
    (u.status||[]).forEach(function(st) {
      var rs = resolveStatus(st);
      if (!rs || !rs.matched) return;
      if (rs.effect.dot) lines.push("- DOT: " + u.name + " " + st);
      if (rs.effect.hot) lines.push("- HOT: " + u.name + " " + st);
    });
  });

  return lines.join("\n");
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 3.3: 敌人AI (generateRaw 自动推演)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

var ENEMY_AI_PROMPT = [
  "你是战术AI。基于当前战斗状态，决定每个敌方单位本回合的行动。",
  "",
  "规则:",
  "- 如果单位有技能列表，优先使用技能（技能名+对应伤害骰面）",
  "- 没有技能的单位使用普攻（type=melee/ranged, dice=默认武器骰面）",
  "- 重伤单位(HP<30%)以生存优先,可能逃跑或防御",
  "- 智能生物使用战术(夹击/集中火力/掩护伤员)",
  "- 野兽型生物按本能行动(攻击最近的/最弱的)",
  "- 集群单位集体行动",
  "- 考虑环境效果对战术的影响",
  "- 对已死亡目标不产生动作",
  "- 施法单位必须指定attr(施法属性:智/感/魅)",
  "- 远程攻击默认attr=敏, 近战默认attr=力",
  "",
  "输出JSON数组,每个敌方单位一个动作对象:",
  '[{"actor":"敌人名","target":"目标名","type":"melee/ranged/spell/item","attr":"力/敏/体/智/感/魅","weapon/spell":"武器或法术名","skill":"技能名(如有)","dice":"伤害骰面如1d8","save":"敏(法术豁免项,可选)","area":true/false,"half":true/false,"intent":"战术意图简述"},...]',
  "",
  "只输出JSON,不要其他文字。"
].join("\n");

async function generateEnemyActions(combatData) {
  var aliveEnemies = combatData.units.filter(function(u) {
    return u.side === "enemy" && u.hp > 0;
  });
  var aliveAllies = combatData.units.filter(function(u) {
    return u.side === "ally" && u.hp > 0;
  });
  if (aliveEnemies.length === 0) return [];

  var stateDesc = "当前回合: " + combatData.round + "\n\n";

  stateDesc += "友方单位:\n";
  aliveAllies.forEach(function(u) {
    stateDesc += "- " + u.name + " Lv." + u.level + " HP" + u.hp + "/" + u.maxhp +
      " AC" + u.ac + " 力" + u.attr.str + "敏" + u.attr.dex + "体" + u.attr.con +
      "智" + u.attr.int + "感" + u.attr.wis + "魅" + u.attr.cha;
    if (u.status.length > 0) stateDesc += " 状态:" + u.status.join(",");
    stateDesc += "\n";
  });

  stateDesc += "\n敌方单位(需要为他们生成行动):\n";
  aliveEnemies.forEach(function(u) {
    stateDesc += "- " + u.name + " Lv." + u.level + " HP" + u.hp + "/" + u.maxhp +
      " AC" + u.ac + " 力" + u.attr.str + "敏" + u.attr.dex + "体" + u.attr.con +
      "智" + u.attr.int + "感" + u.attr.wis + "魅" + u.attr.cha;
    if (u.status.length > 0) stateDesc += " 状态:" + u.status.join(",");
    if (u.skills && Object.keys(u.skills).length > 0) stateDesc += " 技能:" + JSON.stringify(u.skills);
    stateDesc += "\n";
  });

  if (combatData.env && combatData.env.length > 0) {
    stateDesc += "\n环境效果:\n";
    combatData.env.forEach(function(e) {
      stateDesc += "- " + e.name + ": " + (e.effect || "") + "\n";
    });
  }

  try {
    var response = await TavernHelper.generateRaw({
      user_input: stateDesc,
      ordered_prompts: [
        { role: "system", content: ENEMY_AI_PROMPT },
      ],
      should_silence: true,
      max_chat_history: 0,
    });
    var text = typeof response === "string" ? response : (response && response.text) || String(response);
    // 提取JSON
    var jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return [];
  } catch(e) {
    console.error("[Combat] 敌人AI推演失败:", e);
    return [];
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 4: 底部状态栏 UI (Tab系统)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

var COMBAT_ACTIVE_TAB = 'chars';
var COMBAT_BAR_COLLAPSED = false;
var COMBAT_BAR_HIDDEN = false;
var COMBAT_LAST_NARRATION = '';
var COMBAT_LAST_FLOW = '';
var COMBAT_LAST_SETTLE = '';

// 战棋地图状态
var COMBAT_MAP_TOKENS = {};       // {unitName: {col:0, row:0}}
var COMBAT_MAP_GRID = {cols:12, rows:10, cellSize:48};
var COMBAT_MAP_DRAG = null;       // 当前拖拽的token
var COMBAT_MAP_ARROWS = [];       // 攻击箭头 [{from,to,damage,color}]
var COMBAT_MAP_SCALE = 1;
var COMBAT_SELECTED_UNIT = null;  // 当前选中的token

/** 单位编辑器弹窗 — 保留，改为状态栏触发 */
function buildUnitEditor(unitData) {
  var u = unitData || {};
  var isNew = !u.name;
  var title = isNew ? "添加单位" : "编辑: " + u.name;
  var html = '<div id="combat-unit-editor-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:100000;display:flex;align-items:center;justify-content:center;">';
  html += '<div style="background:#1e1e2e;border:1px solid #444;border-radius:8px;padding:16px;width:90%;max-width:420px;max-height:85vh;overflow-y:auto;color:#e0d0b0;font-size:13px;">';
  html += '<b style="font-size:1.1rem;">' + title + '</b>';
  html += '<div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;">';
  html += '<div style="display:flex;gap:8px;align-items:center;">';
  html += '<div style="flex:1;"><span style="color:#888;">名称</span><input id="ue-name" value="' + (u.name||'') + '" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;"></div>';
  html += '<div style="width:44px;height:44px;border-radius:50%;background:#2a2a3a;border:2px dashed #555;display:flex;align-items:center;justify-content:center;overflow:hidden;cursor:pointer;position:relative;flex-shrink:0;" id="ue-avatar-preview" title="点击上传头像">';
  html += '<span style="font-size:18px;color:#888;">' + (u.avatar ? '' : '📷') + '</span>';
  if (u.avatar) html += '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;">';
  html += '</div>';
  html += '</div>';
  html += '<input type="file" id="ue-avatar-input" accept="image/*" style="display:none;">';
  html += '<div style="display:flex;gap:8px;">';
  html += '<div style="flex:1;"><span style="color:#888;">阵营</span><select id="ue-side" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;">';
  html += '<option value="ally" '+(u.side==='ally'?'selected':'')+'>友方</option><option value="enemy" '+(u.side==='enemy'?'selected':'')+'>敌方</option><option value="neutral" '+(u.side==='neutral'?'selected':'')+'>中立</option>';
  html += '</select></div><div style="flex:1;"><span style="color:#888;">类型</span><select id="ue-type" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;">';
  html += '<option value="creature" '+(u.type==='creature'?'selected':'')+'>生物</option><option value="swarm" '+(u.type==='swarm'?'selected':'')+'>集群</option><option value="player" '+(u.type==='player'?'selected':'')+'>角色</option><option value="npc" '+(u.type==='npc'?'selected':'')+'>NPC</option>';
  html += '</select></div></div>';
  html += '<div style="display:flex;gap:8px;"><div style="flex:1;"><span style="color:#888;">等级</span><input id="ue-level" type="number" value="'+(u.level||1)+'" min="1" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;"></div>';
  html += '<div style="flex:1;"><span style="color:#888;">AC</span><input id="ue-ac" type="number" value="'+(u.ac||10)+'" min="0" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;"></div></div>';
  html += '<div style="display:flex;gap:8px;"><div style="flex:1;"><span style="color:#888;">HP当前</span><input id="ue-hp" type="number" value="'+(u.hp!==undefined?u.hp:u.maxhp||10)+'" min="0" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;"></div>';
  html += '<div style="flex:1;"><span style="color:#888;">HP最大</span><input id="ue-maxhp" type="number" value="'+(u.maxhp||10)+'" min="1" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;"></div></div>';
  html += '<div><span style="color:#888;">六维属性</span></div>';
  var attrs = [{key:"str",label:"力",v:(u.attr&&u.attr.str)||10},{key:"dex",label:"敏",v:(u.attr&&u.attr.dex)||10},{key:"con",label:"体",v:(u.attr&&u.attr.con)||10},{key:"int",label:"智",v:(u.attr&&u.attr.int)||10},{key:"wis",label:"感",v:(u.attr&&u.attr.wis)||10},{key:"cha",label:"魅",v:(u.attr&&u.attr.cha)||10}];
  html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;">';
  attrs.forEach(function(a){ html += '<div><span style="font-size:10px;color:#888;">'+a.label+'</span><input id="ue-attr-'+a.key+'" type="number" value="'+a.v+'" min="0" style="width:100%;padding:3px 4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:12px;"></div>'; });
  html += '</div>';
  html += '<div style="display:flex;gap:8px;"><div style="flex:1;"><span style="color:#888;">MP当前</span><input id="ue-mp" type="number" value="'+(u.mp||0)+'" min="0" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;"></div>';
  html += '<div style="flex:1;"><span style="color:#888;">MP最大</span><input id="ue-maxmp" type="number" value="'+(u.maxmp||0)+'" min="0" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;"></div></div>';
  html += '<div><span style="color:#888;">状态</span><input id="ue-status" value="' + ((u.status||[]).join(',')) + '" placeholder="逗号分隔, 如 流血(d6),力+4,狂暴" style="width:100%;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:12px;"></div>';
  html += '<div style="display:flex;gap:8px;margin-top:10px;">';
  html += '<button id="ue-cancel" style="flex:1;padding:6px;background:#444;color:#fff;border:none;border-radius:4px;cursor:pointer;">取消</button>';
  html += '<button id="ue-save" style="flex:1;padding:6px;background:#16a34a;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;">' + (isNew?'添加':'保存') + '</button>';
  html += '</div></div></div></div>';
  return html;
}

function collectEditorData() {
  var u = {
    name: ($("#ue-name").val()||'未命名').trim(),
    side: $("#ue-side").val(), type: $("#ue-type").val(),
    level: parseInt($("#ue-level").val())||1, ac: parseInt($("#ue-ac").val())||10,
    hp: parseInt($("#ue-hp").val())||0, maxhp: parseInt($("#ue-maxhp").val())||10,
    mp: parseInt($("#ue-mp").val())||0, maxmp: parseInt($("#ue-maxmp").val())||0,
    attr: { str: parseInt($("#ue-attr-str").val())||10, dex: parseInt($("#ue-attr-dex").val())||10, con: parseInt($("#ue-attr-con").val())||10, int: parseInt($("#ue-attr-int").val())||10, wis: parseInt($("#ue-attr-wis").val())||10, cha: parseInt($("#ue-attr-cha").val())||10 },
    status: ($("#ue-status").val()||'').split(',').map(function(s){return s.trim();}).filter(Boolean), skills: {},
    avatar: ($("#ue-avatar-preview img").attr("src") || '')
  };
  return u;
}

function openUnitEditor(unitName) {
  // 如果战斗没初始化，自动创建空白战斗
  if (!Combat.data || !Combat.data.active) {
    Combat.init([], [], "新战斗");
  }
  var unit = unitName ? Combat.findUnit(unitName) : null;
  $("body").append(buildUnitEditor(unit));
  // 头像上传
  $("#ue-avatar-preview").on("click", function(){ $("#ue-avatar-input").click(); });
  $("#ue-avatar-input").on("change", function(e){
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev){
      $("#ue-avatar-preview").html('<img src="'+ev.target.result+'" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;">');
    };
    reader.readAsDataURL(file);
  });
  $("#ue-cancel").on("click", function(){ $("#combat-unit-editor-overlay").remove(); });
  $("#ue-save").on("click", function(){
    var data = collectEditorData();
    Combat.applyUnits([data]);
    Combat.save();
    refreshCombatBar();
    $("#combat-unit-editor-overlay").remove();
  });
  $("#combat-unit-editor-overlay").on("click", function(e){ if (e.target === this) $(this).remove(); });
}

/* ─────────── 状态栏构建器 ─────────── */

function buildCombatBar() {
  var data = Combat.data;
  var active = (data && data.active);
  var cls = COMBAT_BAR_COLLAPSED ? ' cb-minimized' : '';
  var hdrText = active ? ((data.battleName||"战斗") + ' · 回合 ' + data.round) : '战斗引擎 (待机)';

  var html = '<div id="combat-bar" class="' + cls + '">';

  // 标题栏
  html += '<div id="cb-header">';
  html += '<span id="cb-title">' + hdrText + '</span>';
  html += '<div id="cb-tab-bar">';
  html += '<button class="cb-tab' + (COMBAT_ACTIVE_TAB==='chars'?' active':'') + '" data-tab="chars">角色</button>';
  html += '<button class="cb-tab' + (COMBAT_ACTIVE_TAB==='summary'?' active':'') + '" data-tab="summary">摘要</button>';
  html += '<button class="cb-tab' + (COMBAT_ACTIVE_TAB==='flow'?' active':'') + '" data-tab="flow">流程</button>';
  html += '<button class="cb-tab' + (COMBAT_ACTIVE_TAB==='settle'?' active':'') + '" data-tab="settle">结算</button>';
  html += '<button class="cb-tab' + (COMBAT_ACTIVE_TAB==='map'?' active':'') + '" data-tab="map">地图</button>';
  html += '<button class="cb-tab' + (COMBAT_ACTIVE_TAB==='settings'?' active':'') + '" data-tab="settings">设置</button>';
  html += '</div>';
  html += '<button id="cb-collapse-btn" title="最小化">' + (COMBAT_BAR_COLLAPSED ? '▲' : '▼') + '</button>';
  html += '<button id="cb-close-btn" title="关闭面板">✕</button>';
  html += '</div>';

  // 面板体
  html += '<div id="cb-body">';

  // Tab: 角色
  html += '<div id="cb-tab-chars" class="cb-tab-panel' + (COMBAT_ACTIVE_TAB==='chars'?'':' cb-hidden') + '">';
  html += buildCharsTabContent(data);
  html += '</div>';

  // Tab: 摘要
  html += '<div id="cb-tab-summary" class="cb-tab-panel' + (COMBAT_ACTIVE_TAB==='summary'?'':' cb-hidden') + '">';
  html += '<div style="white-space:pre-wrap;max-height:200px;overflow-y:auto;">' + (COMBAT_LAST_NARRATION || '暂无摘要') + '</div>';
  html += '</div>';

  // Tab: 流程
  html += '<div id="cb-tab-flow" class="cb-tab-panel' + (COMBAT_ACTIVE_TAB==='flow'?'':' cb-hidden') + '">';
  html += '<div style="white-space:pre-wrap;max-height:200px;overflow-y:auto;font-size:11px;font-family:monospace;">' + (COMBAT_LAST_FLOW || '暂无流程数据') + '</div>';
  html += '</div>';

  // Tab: 结算
  html += '<div id="cb-tab-settle" class="cb-tab-panel' + (COMBAT_ACTIVE_TAB==='settle'?'':' cb-hidden') + '">';
  html += '<div style="white-space:pre-wrap;max-height:200px;overflow-y:auto;font-size:11px;">' + (COMBAT_LAST_SETTLE || '暂无结算数据') + '</div>';
  html += '</div>';

  // Tab: 地图
  html += '<div id="cb-tab-map" class="cb-tab-panel' + (COMBAT_ACTIVE_TAB==='map'?'':' cb-hidden') + '">';
  html += buildMapTabContent(data);
  html += '</div>';

  // Tab: 设置
  html += '<div id="cb-tab-settings" class="cb-tab-panel' + (COMBAT_ACTIVE_TAB==='settings'?'':' cb-hidden') + '">';
  html += buildSettingsTabContent();
  html += '</div>';

  html += '</div>'; // #cb-body

  // 输入行
  html += '<div id="cb-input-row">';
  html += '<input id="cb-action-input" type="text" placeholder="输入战斗动作 (如: 用火焰箭攻击哥布林A)..." maxlength="300">';
  html += '<button id="cb-btn-add-unit">+ 单位</button>';
  html += '<button id="cb-next-round">下一回合 ▶</button>';
  html += '<button id="cb-end-combat">终止 ⏹</button>';
  html += '</div>';

  html += '</div>'; // #combat-bar
  return html;
}

function buildCharsTabContent(data) {
  if (!data || !data.units || data.units.length === 0) {
    return '<div style="color:#8b7355;padding:20px;text-align:center;font-style:italic;">暂无单位 · 点击下方「+ 单位」添加</div>';
  }
  var html = '';
  data.units.forEach(function(u) {
    if (u.hp <= 0) {
      html += '<div style="opacity:0.4;padding:6px 10px;margin-bottom:3px;border:1px solid #3d2b1f;border-radius:6px;background:rgba(0,0,0,0.15);">💀 <b>' + u.name + '</b> <span style="color:#8b7355;">阵亡</span></div>';
      return;
    }
    var allyColor = '#8fbc8f';  // 暗海绿
    var enemyColor = '#cd5c5c'; // 印度红
    var neutralColor = '#daa520'; // 金菊
    var sideColor = u.side === "ally" ? allyColor : (u.side === "enemy" ? enemyColor : neutralColor);
    var hpPct = Math.round(u.hp / u.maxhp * 100);
    var mpPct = u.maxmp > 0 ? Math.round(u.mp / u.maxmp * 100) : 0;
    var hasMP = u.maxmp > 0;

    html += '<div class="cb-unit-card" data-unit="' + u.name + '" style="padding:8px 10px;margin-bottom:4px;border:1px solid #3d2b1f;border-radius:8px;cursor:pointer;display:flex;gap:10px;align-items:center;">';

    // 头像
    html += '<div style="width:40px;height:40px;border-radius:50%;background:#2f2319;border:2px solid ' + sideColor + ';flex-shrink:0;overflow:hidden;display:flex;align-items:center;justify-content:center;">';
    if (u.avatar) {
      html += '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;">';
    } else {
      var initials = u.name.replace(/[a-zA-Z]/g,'').slice(0,2) || u.name.slice(0,1);
      html += '<span style="font-size:15px;color:' + sideColor + ';font-weight:700;">' + initials + '</span>';
    }
    html += '</div>';

    // 信息区
    html += '<div style="flex:1;min-width:0;">';
    // 名字行
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
    html += '<span style="font-weight:700;color:' + sideColor + ';font-size:13px;">' + u.name + '</span>';
    html += '<span style="font-size:10px;color:#6b5c4e;">Lv.' + (u.level||1) + ' · AC ' + (u.ac||10) + ' <button class="cb-edit-unit" data-unit="'+u.name+'" style="padding:1px 5px;background:#3d2e22;color:#8b7355;border:1px solid #5a3e2e;border-radius:3px;cursor:pointer;font-size:9px;margin-left:4px;">✎</button></span>';
    html += '</div>';
    // ❤️ HP条
    html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">';
    html += '<span style="font-size:10px;color:#cd5c5c;width:14px;">❤️</span>';
    html += '<div style="flex:1;background:#2a1a1a;border-radius:20px;height:5px;overflow:hidden;">';
    html += '<div style="width:' + hpPct + '%;height:100%;background:linear-gradient(90deg,#b22222,#ff6347);border-radius:20px;transition:width 0.3s;"></div>';
    html += '</div>';
    html += '<span style="font-size:10px;color:#d4c5a9;min-width:50px;text-align:right;">' + u.hp + '/' + u.maxhp + '</span>';
    html += '</div>';
    // 💙 MP条 (如果有MP)
    if (hasMP) {
      html += '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">';
      html += '<span style="font-size:10px;color:#63b3ed;width:14px;">💙</span>';
      html += '<div style="flex:1;background:#1a2530;border-radius:20px;height:4px;overflow:hidden;">';
      html += '<div style="width:' + mpPct + '%;height:100%;background:linear-gradient(90deg,#2b6cb0,#4299e1);border-radius:20px;transition:width 0.3s;"></div>';
      html += '</div>';
      html += '<span style="font-size:10px;color:#aab8c2;min-width:50px;text-align:right;">' + (u.mp||0) + '/' + (u.maxmp||0) + '</span>';
      html += '</div>';
    }
    // 属性 + 状态
    html += '<div style="font-size:10px;color:#6b5c4e;margin-top:2px;display:flex;flex-wrap:wrap;gap:2px 8px;">';
    html += '<span>💪'+(u.attr.str||10)+'</span><span>🏃'+(u.attr.dex||10)+'</span><span>🫀'+(u.attr.con||10)+'</span>';
    html += '<span>🧠'+(u.attr.int||10)+'</span><span>👁'+(u.attr.wis||10)+'</span><span>🎭'+(u.attr.cha||10)+'</span>';
    if (u.status && u.status.length > 0) {
      html += '<span style="color:#daa520;margin-left:4px;">⚡' + u.status.join(',') + '</span>';
    }
    html += '</div>';
    html += '</div>'; // info
    html += '</div>'; // card
  });
  return html;
}

/* ─────────── 战棋地图构建器 ─────────── */

function buildMapTabContent(data) {
  if (!data || !data.units || data.units.length === 0) {
    return '<div style="color:#8b7355;padding:20px;text-align:center;font-style:italic;">暂无单位 · 先在「角色」Tab添加</div>';
  }

  autoLayoutMapTokens(data);
  var gs = COMBAT_MAP_GRID;
  var gridW = gs.cols * gs.cellSize;
  var gridH = gs.rows * gs.cellSize;
  var cs = gs.cellSize * COMBAT_MAP_SCALE;

  // 战斗地点 — 从数据中提取
  var location = data.battleName || (data.env && data.env.length > 0 ? data.env[0].name : '未知地点');
  var locationNote = data.env && data.env.length > 0 ? data.env.map(function(e){return e.name;}).join(' · ') : '';

  var html = '';
  // 地点标题
  html += '<div style="text-align:center;padding:6px 0;border-bottom:1px dashed #3d2b1f;margin-bottom:6px;">';
  html += '<span style="font-size:12px;color:#c9a959;font-weight:600;">📍 ' + location + '</span>';
  if (locationNote) html += '<span style="font-size:10px;color:#6b5c4e;margin-left:6px;">' + locationNote + '</span>';
  html += '<span style="font-size:10px;color:#6b5c4e;margin-left:8px;">· 回合 ' + data.round + '</span>';
  html += '</div>';

  // 图例
  html += '<div style="display:flex;gap:10px;justify-content:center;font-size:9px;color:#8b7355;margin-bottom:4px;">';
  html += '<span>🟢 友方</span><span>🔴 敌方</span><span>🟡 中立</span>';
  html += '<span style="margin-left:6px;">|</span>';
  html += '<button class="cb-map-zoom" data-dir="out" style="padding:1px 6px;background:#3d2e22;color:#8b7355;border:1px solid #5a3e2e;border-radius:3px;cursor:pointer;font-size:9px;">−</button>';
  html += '<span style="color:#c9a959;">' + Math.round(COMBAT_MAP_SCALE*100) + '%</span>';
  html += '<button class="cb-map-zoom" data-dir="in" style="padding:1px 6px;background:#3d2e22;color:#8b7355;border:1px solid #5a3e2e;border-radius:3px;cursor:pointer;font-size:9px;">+</button>';
  html += '<button class="cb-map-fit" style="padding:1px 6px;background:#3d2e22;color:#8b7355;border:1px solid #5a3e2e;border-radius:3px;cursor:pointer;font-size:9px;">⊡</button>';
  html += '</div>';

  // 网格
  html += '<div id="cb-map-viewport" style="overflow:auto;max-height:250px;border:2px solid #3d2b1f;border-radius:8px;position:relative;background:#1a1612;">';
  // 阵营区域标识
  html += '<div style="position:absolute;left:0;top:0;width:' + (3*cs) + 'px;height:100%;background:rgba(143,188,143,0.04);z-index:0;pointer-events:none;"></div>';
  html += '<div style="position:absolute;right:0;top:0;width:' + (3*cs) + 'px;height:100%;background:rgba(205,92,92,0.04);z-index:0;pointer-events:none;"></div>';
  // 前线分割线
  var midX = 5 * cs;
  html += '<div style="position:absolute;left:' + midX + 'px;top:0;width:2px;height:100%;background:rgba(201,169,89,0.2);z-index:1;pointer-events:none;"></div>';
  html += '<div style="position:absolute;left:' + (midX-20) + 'px;top:4px;font-size:9px;color:rgba(201,169,89,0.3);pointer-events:none;">⚔️ 前线</div>';

  html += '<div id="cb-map-grid" style="width:' + (gridW * COMBAT_MAP_SCALE) + 'px;height:' + (gridH * COMBAT_MAP_SCALE) + 'px;position:relative;background-image:linear-gradient(rgba(139,115,85,0.08) 1px,transparent 1px),linear-gradient(90deg,rgba(139,115,85,0.08) 1px,transparent 1px);background-size:' + cs + 'px ' + cs + 'px;transform-origin:0 0;">';

  // Tokens
  var aliveUnits = data.units.filter(function(u){ return u.hp > 0; });
  aliveUnits.forEach(function(u){
    var pos = COMBAT_MAP_TOKENS[u.name] || {col:0, row:0};
    var left = pos.col * cs + (cs - 38) / 2;
    var top = pos.row * cs + (cs - 38) / 2;
    var sideColor = u.side === 'ally' ? '#8fbc8f' : (u.side === 'enemy' ? '#cd5c5c' : '#daa520');
    var borderColor = COMBAT_SELECTED_UNIT === u.name ? '#c9a959' : sideColor;
    var hpPct = Math.round(u.hp / u.maxhp * 100);
    var label = u.name.slice(0,3);

    html += '<div class="cb-map-token" data-unit="' + u.name + '" ';
    html += 'style="position:absolute;left:' + left + 'px;top:' + top + 'px;';
    html += 'width:38px;height:38px;border-radius:50%;';
    html += 'background:radial-gradient(circle,#2f2319,#1a1410);border:2px solid ' + borderColor + ';';
    html += 'display:flex;flex-direction:column;align-items:center;justify-content:center;';
    html += 'cursor:grab;z-index:10;overflow:hidden;';
    html += 'box-shadow:0 2px 8px rgba(0,0,0,0.5),0 0 8px ' + sideColor + '33;"';
    html += 'title="' + u.name + ' ❤' + u.hp + '/' + u.maxhp + (u.maxmp>0?' 💙'+u.mp+'/'+u.maxmp:'') + '">';
    if (u.avatar) {
      html += '<img src="' + u.avatar + '" style="width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;opacity:0.7;">';
    }
    html += '<span style="font-size:9px;font-weight:700;color:' + sideColor + ';position:relative;z-index:1;text-shadow:0 1px 3px #000;">' + label + '</span>';
    // HP 小环
    html += '<div style="position:absolute;bottom:2px;left:4px;right:4px;height:3px;background:#2a1a1a;border-radius:2px;"><div style="height:100%;width:' + hpPct + '%;background:linear-gradient(90deg,#b22222,#ff6347);border-radius:2px;"></div></div>';
    html += '</div>';
  });

  // 攻击箭头
  COMBAT_MAP_ARROWS.forEach(function(arr){
    var fromPos = COMBAT_MAP_TOKENS[arr.from];
    var toPos = COMBAT_MAP_TOKENS[arr.to];
    if (!fromPos || !toPos) return;
    var x1 = fromPos.col * cs + cs/2;
    var y1 = fromPos.row * cs + cs/2;
    var x2 = toPos.col * cs + cs/2;
    var y2 = toPos.row * cs + cs/2;
    html += drawArrowSVG(x1, y1, x2, y2, arr.color || '#daa520', String(arr.damage||''));
  });

  html += '</div>'; // grid
  html += '</div>'; // viewport
  html += '<div style="font-size:9px;color:#5a4a3a;padding:3px 8px;text-align:center;">💡 拖拽单位到格子上 · 点击选中 · 回合结算后自动画攻击箭头</div>';
  return html;
}

function drawArrowSVG(x1, y1, x2, y2, color, label, idx) {
  var dx = x2 - x1, dy = y2 - y1;
  var len = Math.sqrt(dx*dx + dy*dy);
  if (len < 5) return '';
  var midX = (x1+x2)/2, midY = (y1+y2)/2;
  var angle = Math.atan2(dy, dx) * 180 / Math.PI;
  return '<svg style="position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:5;"><line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+color+'" stroke-width="2" stroke-dasharray="4,3" opacity="0.8"/><polygon points="'+x2+','+y2+' '+(x2-8)+','+(y2-4)+' '+(x2-8)+','+(y2+4)+'" fill="'+color+'" opacity="0.8" transform="rotate('+angle+' '+x2+' '+y2+')"/><text x="'+midX+'" y="'+(midY-5)+'" fill="'+color+'" font-size="10" text-anchor="middle" style="text-shadow:0 1px 2px #000;">'+(label||'')+'</text></svg>';
}

function autoLayoutMapTokens(data) {
  var alive = data.units.filter(function(u){ return u.hp > 0; });
  var allyIdx = 0, enemyIdx = 0;
  var gs = COMBAT_MAP_GRID;
  alive.forEach(function(u){
    if (COMBAT_MAP_TOKENS[u.name]) return; // 已有位置
    if (u.side === 'ally') {
      COMBAT_MAP_TOKENS[u.name] = {col: 2 + (allyIdx % 3), row: 2 + Math.floor(allyIdx / 3)};
      allyIdx++;
    } else {
      COMBAT_MAP_TOKENS[u.name] = {col: gs.cols - 4 + (enemyIdx % 3), row: 2 + Math.floor(enemyIdx / 3)};
      enemyIdx++;
    }
  });
  // 清除不存在的单位的token
  var names = alive.map(function(u){ return u.name; });
  Object.keys(COMBAT_MAP_TOKENS).forEach(function(k){
    if (names.indexOf(k) < 0) delete COMBAT_MAP_TOKENS[k];
  });
}

function buildSettingsTabContent() {
  var html = '<div style="padding:8px;font-size:12px;">';

  // API模式
  html += '<div style="margin-bottom:10px;"><b>API 模式</b></div>';
  html += '<div style="display:flex;gap:6px;margin-bottom:12px;">';
  html += '<button class="cb-mode-btn' + (CombatAPI.apiMode==='follow'?' cb-btn-active':'') + '" data-mode="follow" style="flex:1;padding:6px;border:1px solid #555;border-radius:4px;cursor:pointer;background:#2a2a3a;color:#e0d0b0;">跟随酒馆AI</button>';
  html += '<button class="cb-mode-btn' + (CombatAPI.apiMode==='separate'?' cb-btn-active':'') + '" data-mode="separate" style="flex:1;padding:6px;border:1px solid #555;border-radius:4px;cursor:pointer;background:#2a2a3a;color:#e0d0b0;">独立API</button>';
  html += '</div>';

  // API配置
  html += '<div id="cb-api-config" style="' + (CombatAPI.apiMode==='separate'?'':'display:none;') + '">';
  html += '<div style="margin-bottom:8px;"><b>API 预设</b></div>';
  html += '<div style="display:flex;gap:4px;margin-bottom:8px;">';
  html += '<select id="cb-preset-select" style="flex:1;padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:11px;">';
  html += '<option value="">-- 新建预设 --</option>';
  CombatAPI.presets.forEach(function(p) {
    html += '<option value="' + p.name + '"' + (CombatAPI.active===p.name?' selected':'') + '>' + p.name + '</option>';
  });
  html += '</select>';
  html += '<button id="cb-preset-del" style="padding:4px 8px;background:#dc2626;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;">删除</button>';
  html += '</div>';
  html += '<div style="display:flex;flex-direction:column;gap:4px;">';
  html += '<input id="cb-api-url" placeholder="API URL" style="padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:11px;">';
  html += '<input id="cb-api-key" placeholder="API Key" style="padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:11px;">';
  html += '<input id="cb-api-source" placeholder="Source (如 openai)" style="padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:11px;">';
  html += '<input id="cb-api-model" placeholder="Model" style="padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:11px;">';
  html += '<input id="cb-api-proxy" placeholder="Proxy Preset" style="padding:4px;background:#2a2a3a;border:1px solid #555;color:#e0d0b0;border-radius:3px;font-size:11px;">';
  html += '</div>';
  html += '<button id="cb-preset-save" style="margin-top:6px;padding:4px 12px;background:#2563eb;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;">保存预设</button>';
  html += '</div>';

  // 注入方式
  html += '<div style="margin-top:12px;margin-bottom:10px;"><b>战斗状态注入</b></div>';
  html += '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px;">';
  ['message','prompt','both','none'].forEach(function(m) {
    var labels = {message:'聊天消息',prompt:'Prompt变量',both:'两者',none:'不注入'};
    html += '<button class="cb-inject-btn' + (CombatAPI.injectMode===m?' cb-btn-active':'') + '" data-inject="' + m + '" style="padding:4px 10px;border:1px solid #555;border-radius:4px;cursor:pointer;background:#2a2a3a;color:#e0d0b0;font-size:11px;">' + labels[m] + '</button>';
  });
  html += '</div>';

  html += '</div>';
  return html;
}

/* ─────────── DOM注入/刷新 ─────────── */

function mountCombatBar() {
  $("#combat-bar, #combat-bar-css, #cb-reopen-btn").remove();

  $('<style id="combat-bar-css">').text([
    // 主面板 — D&D羊皮纸主题, 可拖拽弹出
    '#combat-bar { position:fixed; bottom:80px; right:20px; z-index:90000; width:420px; max-height:65vh; background:linear-gradient(180deg,#1e1814,#261f18); border:2px solid #5a3e2e; border-radius:12px; box-shadow:0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(200,170,100,0.08); font-size:12px; color:#d4c5a9; display:flex; flex-direction:column; font-family:\"Segoe UI\",system-ui,\"Noto Sans SC\",sans-serif; transition:opacity 0.2s; }',
    '#combat-bar.cb-minimized { max-height:38px; overflow:hidden; }',
    '#combat-bar.cb-minimized #cb-body, #combat-bar.cb-minimized #cb-input-row { display:none; }',
    // 标题栏 — 可拖拽手柄
    '#cb-header { display:flex; align-items:center; padding:6px 10px; background:linear-gradient(180deg,#3d2e22,#2f2319); border-bottom:2px solid #5a3e2e; border-radius:10px 10px 0 0; cursor:move; user-select:none; min-height:24px; gap:6px; }',
    '#cb-title { font-weight:700; font-size:12px; color:#c9a959; text-shadow:0 1px 2px rgba(0,0,0,0.5); white-space:nowrap; }',
    '#cb-title::before { content:\"⚔️ \"; }',
    // Tab按钮
    '#cb-tab-bar { display:flex; gap:1px; flex:1; justify-content:center; }',
    '.cb-tab { padding:4px 9px; border:1px solid transparent; background:transparent; color:#a89880; cursor:pointer; font-size:10px; border-radius:4px; transition:all 0.15s; white-space:nowrap; font-family:inherit; }',
    '.cb-tab:hover { background:rgba(139,69,19,0.3); color:#d4c5a9; border-color:#5a3e2e; }',
    '.cb-tab.active { background:#5a2d0f; color:#c9a959; border-color:#8b6914; font-weight:600; }',
    // 折叠按钮
    '#cb-collapse-btn { padding:2px 8px; border:1px solid #5a3e2e; background:transparent; color:#8b7355; cursor:pointer; font-size:12px; border-radius:4px; }',
    '#cb-collapse-btn:hover { color:#c9a959; border-color:#8b6914; }',
    '#cb-close-btn { padding:2px 6px; border:1px solid transparent; background:transparent; color:#8b7355; cursor:pointer; font-size:13px; border-radius:4px; font-weight:700; }',
    '#cb-close-btn:hover { color:#cd5c5c; border-color:#5a2e2e; }',
    '#cb-reopen-btn { display:none; position:fixed; bottom:20px; right:20px; z-index:90001; width:44px;height:44px;border-radius:50%;background:linear-gradient(180deg,#3d2e22,#2f2319);border:2px solid #8b6914;color:#c9a959;font-size:20px;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,0.5); }',
    '#cb-reopen-btn:hover { background:linear-gradient(180deg,#5a3e2e,#3d2e22); }',
    // 面板体
    '#cb-body { flex:1; overflow-y:auto; max-height:40vh; padding:10px; background:rgba(0,0,0,0.2); }',
    '#cb-body::-webkit-scrollbar { width:5px; }',
    '#cb-body::-webkit-scrollbar-track { background:transparent; }',
    '#cb-body::-webkit-scrollbar-thumb { background:#5a3e2e; border-radius:3px; }',
    '.cb-tab-panel { display:block; }',
    '.cb-tab-panel.cb-hidden { display:none !important; }',
    // 输入行
    '#cb-input-row { display:flex; gap:6px; padding:8px 10px; background:rgba(0,0,0,0.3); border-top:1px solid #3d2b1f; border-radius:0 0 10px 10px; align-items:center; }',
    '#cb-action-input { flex:1; padding:8px 10px; background:#1a1410; border:1px solid #5a3e2e; color:#d4c5a9; border-radius:6px; font-size:11px; font-family:inherit; }',
    '#cb-action-input::placeholder { color:#6b5c4e; }',
    '#cb-action-input:focus { border-color:#8b6914; outline:none; }',
    '#cb-input-row button { padding:6px 12px; border-radius:6px; cursor:pointer; font-size:11px; font-family:inherit; font-weight:600; }',
    '#cb-btn-add-unit { background:#3d2e22; color:#c9a959; border:1px solid #5a3e2e; }',
    '#cb-btn-add-unit:hover { background:#5a3e2e; }',
    '#cb-next-round { background:linear-gradient(180deg,#5a2d0f,#3d1f0a); color:#d4c5a9; border:1px solid #8b6914; }',
    '#cb-next-round:hover { background:linear-gradient(180deg,#6b3815,#4d280d); }',
    '#cb-next-round:disabled { opacity:0.5; }',
    '#cb-end-combat { background:transparent; color:#b34a4a; border:1px solid #5a2e2e; }',
    '#cb-end-combat:hover { background:rgba(179,74,74,0.15); }',
    '.cb-btn-active { background:#5a2d0f !important; color:#c9a959 !important; border-color:#8b6914 !important; }',
    // 单位卡片
    '.cb-unit-card { background:rgba(0,0,0,0.2); border:1px solid #3d2b1f; border-radius:8px; margin-bottom:4px; }',
    '.cb-unit-card:hover { border-color:#5a3e2e; background:rgba(0,0,0,0.3); }',
    // 地图
    '#cb-map-viewport { border:1px solid #3d2b1f; border-radius:6px; scrollbar-width:thin; }',
    '#cb-map-viewport::-webkit-scrollbar { width:4px; height:4px; }',
    '#cb-map-viewport::-webkit-scrollbar-thumb { background:#5a3e2e; border-radius:2px; }',
    '.cb-map-token { transition:left 0.3s ease,top 0.3s ease,transform 0.15s,box-shadow 0.15s; }',
    '.cb-map-token:hover { transform:scale(1.25); z-index:20 !important; }',
    '.cb-map-token.cb-selected { border-color:#c9a959 !important; box-shadow:0 0 14px rgba(201,169,89,0.5) !important; animation:cb-pulse 1.2s ease-in-out infinite; }',
    '@keyframes cb-pulse { 0%,100% { box-shadow:0 0 6px rgba(201,169,89,0.3); } 50% { box-shadow:0 0 16px rgba(201,169,89,0.7); } }',
    // 设置面板
    '.cb-setting-row { margin-bottom:8px; }',
    '.cb-setting-row b { color:#c9a959; font-size:11px; }',
    'input[type=text], input[type=number], select { font-family:inherit; }',
    // 移动端
    '@media (max-width:768px) {',
    '  #combat-bar { width:94vw; right:3vw; bottom:70px; max-height:55vh; }',
    '  #cb-title { font-size:10px; }',
    '  .cb-tab { padding:3px 5px; font-size:9px; }',
    '  #cb-body { max-height:30vh; padding:6px; }',
    '  #cb-map-viewport { max-height:160px; }',
    '}',
    '@media (max-width:480px) {',
    '  #combat-bar { width:96vw; right:2vw; bottom:60px; max-height:60vh; font-size:11px; }',
    '  #cb-title { font-size:9px; }',
    '  .cb-tab { padding:2px 4px; font-size:8px; }',
    '  #cb-body { max-height:25vh; }',
    '  #cb-input-row { gap:3px; padding:5px; }',
    '  #cb-input-row input { font-size:10px; }',
    '  #cb-input-row button { font-size:9px; padding:5px 7px; }',
    '  #cb-map-viewport { max-height:120px; }',
    '}',
  ].join('\n')).appendTo('head');

  var $bar = $(buildCombatBar()).appendTo('body');
  // 重新打开按钮
  if (!$('#cb-reopen-btn').length) {
    $('<button id="cb-reopen-btn" title="打开战斗面板">⚔</button>').appendTo('body');
    $(document).off("click.cbreopen").on("click.cbreopen", "#cb-reopen-btn", function(){
      $("#combat-bar").show();
      $("#cb-reopen-btn").hide();
    });
  }
  initCombatBarDrag($bar);
  bindCombatBarEvents();
  return $bar;
}

/** 全局开关 — 供酒馆助手脚本按钮调用 */
window.toggleCombatBar = function(){
  if (COMBAT_BAR_HIDDEN) {
    COMBAT_BAR_HIDDEN = false;
    $("#combat-bar").show();
    $("#cb-reopen-btn").hide();
  } else {
    COMBAT_BAR_HIDDEN = true;
    $("#combat-bar").hide();
    $("#cb-reopen-btn").show();
  }
};

/** 面板拖拽 — 全局单例, 避免刷新泄露 */
var _cbDrag = null;
var _cbDragEl = null;
function _cbDragStart(e) {
  var el = _cbDragEl;
  if (!el || e.target.tagName === 'BUTTON') return;
  // 清除CSS的right/bottom, 用实际像素位置初始化left/top
  var r = el.getBoundingClientRect();
  el.style.left = r.left + 'px';
  el.style.top = r.top + 'px';
  el.style.right = 'auto';
  el.style.bottom = 'auto';
  el.style.transition = 'none';
  _cbDrag = {x: e.clientX - r.left, y: e.clientY - r.top};
  e.preventDefault();
}
function _cbDragMove(e) {
  if (!_cbDrag || !_cbDragEl) return;
  _cbDragEl.style.left = (e.clientX - _cbDrag.x) + 'px';
  _cbDragEl.style.top = (e.clientY - _cbDrag.y) + 'px';
}
function _cbDragEnd() {
  if (_cbDrag) { _cbDrag = null; if (_cbDragEl) _cbDragEl.style.transition = ''; }
}
function initCombatBarDrag($bar) {
  _cbDragEl = $bar[0];
  var hdr = _cbDragEl.querySelector('#cb-header');
  if (!hdr) return;
  // 只绑定一次
  if (!_cbDragEl._dragBound) {
    hdr.addEventListener('mousedown', _cbDragStart);
    document.addEventListener('mousemove', _cbDragMove);
    document.addEventListener('mouseup', _cbDragEnd);
    hdr.addEventListener('touchstart', function(e){
      if (e.target.tagName === 'BUTTON') return;
      var t = e.touches[0];
      var r = _cbDragEl.getBoundingClientRect();
      _cbDragEl.style.left = r.left + 'px';
      _cbDragEl.style.top = r.top + 'px';
      _cbDragEl.style.right = 'auto';
      _cbDragEl.style.bottom = 'auto';
      _cbDragEl.style.transition = 'none';
      _cbDrag = {x: t.clientX - r.left, y: t.clientY - r.top};
      e.preventDefault();
    }, {passive:false});
    document.addEventListener('touchmove', function(e){
      if (!_cbDrag || !_cbDragEl) return;
      var t = e.touches[0];
      _cbDragEl.style.left = (t.clientX - _cbDrag.x) + 'px';
      _cbDragEl.style.top = (t.clientY - _cbDrag.y) + 'px';
    }, {passive:false});
    document.addEventListener('touchend', _cbDragEnd);
    _cbDragEl._dragBound = true;
  } else {
    // 刷新时更新引用
    _cbDragEl = $bar[0];
  }
}

function refreshCombatBar() {
  // 用户手动关闭了就跳过渲染，只保持浮球可见
  if (COMBAT_BAR_HIDDEN) return;
  var $bar = $("#combat-bar");
  if ($bar.length === 0) { mountCombatBar(); return; }
  var wasMin = $bar.hasClass("cb-minimized");
  var pos = $bar.position();
  var $newBar = $(buildCombatBar());
  if (wasMin) $newBar.addClass("cb-minimized");
  $bar.replaceWith($newBar);
  // 保持位置
  if (pos.left || pos.top) $newBar.css({left:pos.left, top:pos.top, right:'auto', bottom:'auto'});
  initCombatBarDrag($newBar);
  bindCombatBarEvents();
}

function refreshPanel() {
  // 向下兼容旧调用
  refreshCombatBar();
}

function bindCombatBarEvents() {
  // Tab切换
  $(".cb-tab").off("click").on("click", function(){
    var tab = $(this).data("tab");
    switchCombatTab(tab);
  });

  // 折叠
  $("#cb-collapse-btn").off("click").on("click", function(){
    COMBAT_BAR_COLLAPSED = !COMBAT_BAR_COLLAPSED;
    $("#combat-bar").toggleClass("cb-minimized", COMBAT_BAR_COLLAPSED);
    $("#cb-collapse-btn").text(COMBAT_BAR_COLLAPSED ? "▼" : "▲");
  });

  // 关闭
  $("#cb-close-btn").off("click").on("click", function(){
    COMBAT_BAR_HIDDEN = true;
    $("#combat-bar").hide();
    $("#cb-reopen-btn").show();
  });

  // 重新打开
  $("#cb-reopen-btn").off("click").on("click", function(){
    COMBAT_BAR_HIDDEN = false;
    $("#combat-bar").show();
    $("#cb-reopen-btn").hide();
  });

  // 下一回合
  $("#cb-next-round").off("click").on("click", async function(){ await handleNextRound(); });

  // 终止
  $("#cb-end-combat").off("click").on("click", async function(){ await handleEndCombat(); });

  // 添加单位
  $("#cb-btn-add-unit").off("click").on("click", function(){ openUnitEditor(null); });

  // 编辑单位
  $(".cb-edit-unit").off("click").on("click", function(e){
    e.stopPropagation();
    openUnitEditor($(this).data("unit"));
  });

  // 单位卡片点击 → 编辑
  $(".cb-unit-card").off("click").on("click", function(){
    openUnitEditor($(this).data("unit"));
  });

  // API模式切换
  $(".cb-mode-btn").off("click").on("click", function(){
    var mode = $(this).data("mode");
    CombatAPI.setApiMode(mode);
    refreshCombatBar();
  });

  // 注入方式切换
  $(".cb-inject-btn").off("click").on("click", function(){
    var inj = $(this).data("inject");
    CombatAPI.setInjectMode(inj);
    refreshCombatBar();
  });

  // 预设选择
  $("#cb-preset-select").off("change").on("change", function(){
    var name = $(this).val();
    if (name) {
      CombatAPI.setActive(name);
      refreshCombatBar();
    }
  });

  // 预设保存
  $("#cb-preset-save").off("click").on("click", function(){
    var name = $("#cb-preset-select").val() || prompt("预设名称:");
    if (!name) return;
    var cfg = {
      apiUrl: $("#cb-api-url").val() || '',
      apiKey: $("#cb-api-key").val() || '',
      apiSource: $("#cb-api-source").val() || '',
      model: $("#cb-api-model").val() || '',
      proxyPreset: $("#cb-api-proxy").val() || ''
    };
    CombatAPI.addPreset(name, cfg);
    CombatAPI.setActive(name);
    refreshCombatBar();
  });

  // 预设删除
  $("#cb-preset-del").off("click").on("click", function(){
    var name = $("#cb-preset-select").val();
    if (name && confirm("删除预设: " + name + "?")) { CombatAPI.removePreset(name); refreshCombatBar(); }
  });

  // Enter键 → 下一回合
  $("#cb-action-input").off("keydown").on("keydown", function(e){
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleNextRound(); }
  });

  // ─── 地图事件 ───
  // 缩放按钮
  $(".cb-map-zoom").off("click").on("click", function(e){
    e.stopPropagation();
    var dir = $(this).data("dir");
    COMBAT_MAP_SCALE = Math.max(0.3, Math.min(2.5, COMBAT_MAP_SCALE + (dir==='in'?0.2:-0.2)));
    refreshCombatBar();
  });
  // 适应窗口
  $(".cb-map-fit").off("click").on("click", function(e){
    e.stopPropagation();
    COMBAT_MAP_SCALE = 1;
    refreshCombatBar();
  });

  // Token交互: 选中 + 拖拽
  var dragState = null;
  $(document).off("mousedown.cbmap touchstart.cbmap", ".cb-map-token").on("mousedown.cbmap touchstart.cbmap", ".cb-map-token", function(e){
    e.preventDefault();
    var unitName = $(this).data("unit");
    COMBAT_SELECTED_UNIT = unitName;
    $(".cb-map-token").removeClass("cb-selected");
    $(this).addClass("cb-selected");

    var clientX = e.clientX || (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0].clientX);
    var clientY = e.clientY || (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0].clientY);
    dragState = {
      unit: unitName,
      startX: clientX,
      startY: clientY,
      $el: $(this),
      origLeft: parseInt($(this).css("left")),
      origTop: parseInt($(this).css("top")),
      dragging: false
    };
  });

  $(document).off("mousemove.cbmap touchmove.cbmap").on("mousemove.cbmap touchmove.cbmap", function(e){
    if (!dragState) return;
    var clientX = e.clientX || (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0].clientX);
    var clientY = e.clientY || (e.originalEvent && e.originalEvent.touches && e.originalEvent.touches[0].clientY);
    var dx = clientX - dragState.startX;
    var dy = clientY - dragState.startY;
    if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    dragState.dragging = true;
    dragState.$el.css({left: dragState.origLeft + dx, top: dragState.origTop + dy, zIndex: 30, cursor: 'grabbing'});
  });

  $(document).off("mouseup.cbmap touchend.cbmap").on("mouseup.cbmap touchend.cbmap", function(e){
    if (!dragState) return;
    if (dragState.dragging) {
      var cs = COMBAT_MAP_GRID.cellSize * COMBAT_MAP_SCALE;
      var col = Math.round((parseInt(dragState.$el.css("left")) + 18) / cs - 0.5);
      var row = Math.round((parseInt(dragState.$el.css("top")) + 18) / cs - 0.5);
      col = Math.max(0, Math.min(COMBAT_MAP_GRID.cols - 1, col));
      row = Math.max(0, Math.min(COMBAT_MAP_GRID.rows - 1, row));
      COMBAT_MAP_TOKENS[dragState.unit] = {col: col, row: row};
      refreshCombatBar();
    }
    dragState = null;
  });
}

function switchCombatTab(tab) {
  COMBAT_ACTIVE_TAB = tab;
  $(".cb-tab").removeClass("active");
  $(".cb-tab[data-tab='" + tab + "']").addClass("active");
  $(".cb-tab-panel").addClass("cb-hidden");
  $("#cb-tab-" + tab).removeClass("cb-hidden");
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 3.5: 智能数据读取 (ZOD → 正文回退)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** 从ZOD变量提取单位 */
function _zodToUnit(obj, defaultName, defaultSide) {
  if (!obj || typeof obj !== 'object') return null;
  var u = {
    name: obj.姓名 || obj.name || defaultName || '未命名',
    side: obj.阵营 || obj.side || defaultSide || 'ally',
    type: obj.类型 || obj.type || 'creature',
    level: obj.等级 || obj.level || 1,
    hp: (obj.HP && obj.HP.当前 !== undefined) ? obj.HP.当前 : (obj.HP && obj.HP.最大) || undefined,
    maxhp: (obj.HP && obj.HP.最大) || undefined,
    mp: (obj.MP && obj.MP.当前 !== undefined) ? obj.MP.当前 : 0,
    maxmp: (obj.MP && obj.MP.最大) || 0,
    ac: obj.护甲值 || obj.ac || 10,
    attr: {
      str: (obj.属性 && obj.属性.力量) || obj.str || 10,
      dex: (obj.属性 && obj.属性.敏捷) || obj.dex || 10,
      con: (obj.属性 && obj.属性.体质) || obj.con || 10,
      int: (obj.属性 && obj.属性.智力) || obj.int || 10,
      wis: (obj.属性 && obj.属性.感知) || obj.wis || 10,
      cha: (obj.属性 && obj.属性.魅力) || obj.cha || 10
    },
    skills: obj.技能 || obj.skills || {},
    status: obj.状态 || obj.status || [],
    swarm: obj.swarm || null
  };
  return u;
}

/** 从ZOD变量读取所有单位 (主角/队友/NPC/异人/生物) */
function fetchUnitsFromZOD() {
  var units = [];
  var zodKeys = ["主角面板", "NPC数据", "异人玩家数据", "生物数据"];

  zodKeys.forEach(function(key) {
    try {
      var data = TavernHelper.getVariables(key);
      if (!data) return;

      // 单个对象 → 一个单位
      if (data.姓名 || data.name) {
        var side = key === "主角面板" ? "ally" : (key === "NPC数据" ? "ally" : "enemy");
        var u = _zodToUnit(data, key, side);
        if (u) units.push(u);
      }
      // 字典对象 → 多个单位
      else if (typeof data === 'object') {
        Object.keys(data).forEach(function(k) {
          var item = data[k];
          if (item && typeof item === 'object') {
            var u = _zodToUnit(item, k, 'ally');
            if (u) units.push(u);
          }
        });
      }
    } catch(e) { console.warn("[Combat] ZOD读取失败: " + key, e); }
  });

  return units;
}

/** 从聊天正文正则提取单位名 */
function extractUnitNamesFromChat(chatText) {
  var names = [];
  // 常见战斗叙事模式
  var patterns = [
    /([^\s，。,.]+)(?:向|朝|对|冲|扑)(?:你|[^\s，。,.]{1,6})(?:攻击|砍|刺|射|打|挥|冲|扑)/g,
    /([^\s，。,.]{1,8})的?(?:HP|hp|生命值|血量)[:：]?\s*\d+/g,
    /(?:敌人|怪物|对手|敌方|哥布林|兽人|骷髅|龙|狼|蛇|蜘蛛|僵尸|幽灵|恶魔)[:：]?\s*([^\s，。,.\d]{1,6})/g,
    /([^\s，。,.\d]{1,6})(?:出现|袭来|靠近|包围|来袭)/g,
    /名叫\s*[「"]([^」"]+)[」"]/g
  ];
  patterns.forEach(function(p){
    var m;
    while ((m = p.exec(chatText)) !== null) {
      var n = (m[1] || '').trim();
      if (n && n.length <= 8 && !/你|我|他|她|它|的|了|在|是|和|就|都|也|这|那/.test(n)) {
        if (names.indexOf(n) < 0) names.push(n);
      }
    }
  });
  return names;
}

/** 综合读取: ZOD优先 → 正文回退 → AI解析兜底 */
function fetchAllUnits(callback) {
  var units = [];

  // 第一步: ZOD
  var zodUnits = fetchUnitsFromZOD();
  if (zodUnits.length > 0) {
    units = zodUnits;
  }

  // 第二步: 正文正则提取 (补充ZOD没有的)
  try {
    var lastId = TavernHelper.getLastMessageId();
    if (lastId) {
      var range = Math.max(0, lastId - 15) + "-" + lastId;
      var msgs = TavernHelper.getChatMessages(range);
      var chatText = msgs.map(function(m){ return m.message || ''; }).join("\n");
      var chatNames = extractUnitNamesFromChat(chatText);

      chatNames.forEach(function(n){
        var exists = units.some(function(u){ return u.name === n; });
        if (!exists) {
          units.push({
            name: n, side: "enemy", type: "creature", level: 1,
            hp: undefined, maxhp: undefined, ac: 10,
            attr: {str:10,dex:10,con:10,int:10,wis:10,cha:10},
            skills: {}, status: [], swarm: null
          });
        }
      });
    }
  } catch(e) { console.warn("[Combat] 正文提取失败:", e); }

  callback(units);
}

// 保留旧名兼容
function fetchAllyFromZOD() {
  return fetchUnitsFromZOD().filter(function(u){ return u.side === 'ally'; });
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 3.6: 护盾 + 集群逻辑
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** 初始化护盾值(从status解析) */
function initShields(unit) {
  if (!unit.status || !Array.isArray(unit.status)) return;
  unit.status.forEach(function(st) {
    var r = resolveStatus(st);
    if (!r || !r.matched) return;
    var e = r.effect;
    if (e.sAb) unit._shield = e.sAb;
    if (e.sChg) unit._shieldCharges = e.sChg;
    if (e.sPct) unit._shield = Math.floor(unit.maxhp * e.sPct);
  });
}

/** 刷新盾值——每回合开始时和状态变更时调用 */
function refreshShields(unit) {
  delete unit._shield; delete unit._shieldCharges;
  initShields(unit);
}

function applyShieldLogic(unit, dmg) {
  // 先确保盾值已初始化（处理中途加盾的情况）
  if (unit._shield === undefined) initShields(unit);
  // 吸收护盾
  if (unit._shield && unit._shield > 0) {
    var absorbed = Math.min(unit._shield, dmg);
    unit._shield -= absorbed;
    if (unit._shield <= 0) { delete unit._shield; unit.status = unit.status.filter(function(s){ return !/护盾/.test(s); }); }
    return dmg - absorbed;
  }
  // 次数护盾
  if (unit._shieldCharges && unit._shieldCharges > 0) {
    unit._shieldCharges--;
    if (unit._shieldCharges <= 0) { delete unit._shieldCharges; unit.status = unit.status.filter(function(s){ return !/护盾/.test(s); }); }
    return 0;
  }
  return dmg;
}

/** 集群修正:
 * - 单体物理攻击 → 伤害减半
 * - 范围法术 → 伤害 ×1.5
 * - 集群HP=0时溃灭
 */
function applySwarmModifiers(target, act, dmg) {
  if (!target.swarm) return dmg;
  if (act.area) {
    // 范围效果 → 集群易伤1.5x
    return Math.floor(dmg * 1.5);
  }
  if (act.type === "melee" || act.type === "ranged") {
    // 单体物理 → 集群减半
    return Math.floor(dmg / 2);
  }
  return dmg;
}

function checkSwarmFlee(target) {
  if (!target.swarm) return false;
  var alivePct = target.swarm.alive / target.swarm.initial;
  // 存活数<30% → 感知豁免DC15，失败则溃逃
  if (alivePct < 0.3) {
    var wisMod = attrMod(target.attr.wis);
    var fleeRoll = rollD20(false, false);
    return (fleeRoll.result + wisMod) < 15;
  }
  return false;
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 5: 事件处理 (重写)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/** 从自然语言解析主角动作 */
function parsePlayerAction(text) {
  if (!text.trim()) return null;
  var act = { actor: "主角", target: "", type: "melee", attr: "力", weapon: "长剑", dice: "1d8", intent: text };

  // 尝试提取目标: "...砍向哥布林A" / "...对哥布林B用火球术"
  var tgtMatch = text.match(/(?:砍向|攻击|射向|打|对|轰|target[：:]?\s*)([^\s，。,\.]+)/);
  if (tgtMatch) act.target = tgtMatch[1];

  // 尝试提取法术/技能名: "用火球术" / "施放火球术" / "火球术"
  var spellMatch = text.match(/(?:用|施放|使用|发动|skill[：:]?\s*)([^\s，。,\.]+术|[^\s，。,\.]+斩|[^\s，。,\.]+击|[^\s，。,\.]+箭|[^\s，。,\.]+波)/);
  if (spellMatch) {
    act.skill = spellMatch[1];
    act.type = "spell";
    // 尝试识别法术伤害骰面
    var dmgMatch = text.match(/(\d*d\d+)/);
    if (dmgMatch) act.dice = dmgMatch[1];
    // 推断施法属性
    if (/治疗|祝福|防护|圣/.test(text)) act.attr = "感";
    if (/火球|闪电|冰|酸|元素|奥术/.test(text)) act.attr = "智";
    if (/暗影|邪|诅咒|恐惧|魅惑/.test(text)) act.attr = "魅";
  }

  // 尝试提取武器名
  var wepMatch = text.match(/(?:用|拿起|拔出|挥舞)([^\s，。,\.]{1,4}(?:剑|刀|弓|斧|枪|杖|锤|矛|匕首|弩|鞭))/);
  if (wepMatch) { act.weapon = wepMatch[1]; }

  return act;
}

/** 获取活着的单位 */
function aliveUnits(side) {
  if (!Combat.data) return [];
  return Combat.data.units.filter(function(u) { return u.hp > 0 && u.side === side; });
}


async function handleInitFromChat() {
  try {
    // BUGFIX: 正确获取最近20条消息
    var lastId = TavernHelper.getLastMessageId();
    var range = Math.max(0, lastId - 20) + "-" + lastId;
    var msgs = TavernHelper.getChatMessages(range);
    var narrative = msgs.map(function(m) { return m.message; }).join("\n");

    var INIT_PROMPT = [
      "分析以下战斗叙事，识别所有参战敌方单位和友方NPC。",
      "不需要包含主角(由系统自动添加)。",
      "对每个单位输出: name(名称), side(enemy/ally), level(等级), ac(护甲值),",
      "  attr(六维属性对象{str,dex,con,int,wis,cha}), status(状态数组),",
      "  type(creature/swarm/player/npc)",
      "如果单位是集群(swarm),额外输出swarm:{alive:N,initial:N}",
      "输出JSON数组：",
      '[{"name":"哥布林A","side":"enemy","level":2,"ac":13,"attr":{"str":10,"dex":12,"con":10,"int":8,"wis":8,"cha":6},"status":[],"type":"creature"},...]',
      "只输出JSON数组，不要其他文字。"
    ].join("\n");

    var response = await TavernHelper.generateRaw({
      user_input: narrative,
      ordered_prompts: [{ role: "system", content: INIT_PROMPT }],
      should_silence: true,
      max_chat_history: 0,
    });
    var text = typeof response === "string" ? response : (response && response.text) || String(response);
    var jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) { toastr.error("未能解析战斗单位。返回文本: " + text.slice(0, 200)); return; }

    var parsedUnits = JSON.parse(jsonMatch[0]);

    // AI识别的敌方
    var aiUnits = parsedUnits || [];

    // 综合读取: ZOD → 正文正则 → AI兜底
    fetchAllUnits(function(zodUnits){
      // 合并: ZOD单位 + AI识别的额外单位 (按名去重)
      var allUnits = zodUnits.slice();
      aiUnits.forEach(function(u){
        var exists = allUnits.some(function(ex){ return ex.name === u.name; });
        if (!exists) allUnits.push(u);
      });

      var allyCount = allUnits.filter(function(u){ return u.side === 'ally'; }).length;
      var enemyCount = allUnits.filter(function(u){ return u.side === 'enemy'; }).length;
      Combat.init(allUnits, [], "遭遇战");
      toastr.success("战斗初始化完成，" + allUnits.length + "个单位 (" + allyCount + "友方 + " + enemyCount + "敌方)");
      refreshCombatBar();
    });
  } catch(e) {
    console.error("[Combat] 初始化失败:", e);
    toastr.error("初始化失败: " + e.message);
  }
}

async function handleNextRound() {
  if (!Combat.data || !Combat.data.active) {
    toastr.warning("没有活跃的战斗");
    return;
  }

  var $btn = $("#combat-next-round");
  $btn.prop("disabled", true).text("结算中...");

  try {
    // 1. 解析主角输入
    var playerText = $("#combat-player-action").val() || "";
    $("#combat-player-action").val("");
    var playerAct = parsePlayerAction(playerText);

    // 2. 清理死亡单位: 检查已有死亡单位，标记溃逃
    Combat.data.units.forEach(function(u) {
      if (u.hp <= 0 && u.side === "enemy") {
        // 已经在上一轮死亡
        u._dead = true;
      }
    });

    // 3. 生成敌人动作
    var enemyActions = [];
    try {
      enemyActions = await generateEnemyActions(Combat.data);
    } catch(e) {
      console.warn("[Combat] 敌人AI失败，使用默认动作:", e);
      // 回退: 每个活着的敌人攻击随机友方目标
      aliveUnits("enemy").forEach(function(enemy) {
        var allies = aliveUnits("ally");
        if (allies.length > 0) {
          var target = allies[Math.floor(Math.random() * allies.length)];
          enemyActions.push({
            actor: enemy.name,
            target: target.name,
            type: "melee",
            attr: "力",
            weapon: "利爪",
            dice: "1d6",
            intent: "常规攻击"
          });
        }
      });
    }

    // 4. 构建完整动作列表（按先攻排序）
    var allActions = [];

    // 主角动作
    if (playerAct) {
      // 如果没指定目标，自动选最近的活着的敌人
      if (!playerAct.target) {
        var enemies = aliveUnits("enemy");
        if (enemies.length > 0) {
          var closest = enemies.reduce(function(a,b) { return (a.hp < b.hp) ? a : b; }); // 优先低血量
          playerAct.target = closest.name;
        }
      }
      allActions.push(playerAct);
    }

    // 敌方动作（附加集群信息）
    enemyActions.forEach(function(act) {
      var enemy = Combat.findUnit(act.actor);
      if (!enemy || enemy.hp <= 0 || enemy._dead) return; // 跳过死亡单位
      // 过滤死亡目标
      var tgt = Combat.findUnit(act.target);
      if (!tgt || tgt.hp <= 0 || tgt._dead) {
        // 重定向到随机活着的友方
        var allies = aliveUnits("ally");
        if (allies.length > 0) {
          act.target = allies[Math.floor(Math.random() * allies.length)].name;
        } else { return; }
      }
      allActions.push(act);
    });

    // 按先攻排序（主角可能不在最前面）
    // TODO: 根据实际先攻值排序

    // 5. 逐条结算
    var results = [];
    var summaryParts = [];

    for (var i=0; i<allActions.length; i++) {
      var act = allActions[i];
      var actor = Combat.findUnit(act.actor);
      var target = Combat.findUnit(act.target);

      // 跳过死亡单位发起的动作
      if (!actor || actor.hp <= 0 || actor._dead) continue;
      // 跳过对死亡目标的动作
      if (!target || target.hp <= 0 || target._dead) {
        // 重定向
        var livingTargets = aliveUnits(act.actor === "主角" ? "enemy" : "ally");
        if (livingTargets.length === 0) continue;
        act.target = livingTargets[Math.floor(Math.random() * livingTargets.length)].name;
        target = Combat.findUnit(act.target);
        if (!target) continue;
      }

      var result = Combat.resolveAction(act);

      // 更新集群存活数
      if (result.damage > 0 && target.swarm) {
        var perUnitHP = target.maxhp / target.swarm.initial;
        target.swarm.alive = Math.max(0, Math.ceil(target.hp / perUnitHP));
        result.swarmAliveAfter = target.swarm.alive + "/" + target.swarm.initial;
      }

      results.push(result);

      // 构建摘要
      var extraTags = [];
      if (result.chargeConsumed) extraTags.push("蓄力");
      if (result.executed) extraTags.push("处决");
      if (result.blocked) extraTags.push("格挡减半");
      if (result.parried) extraTags.push("被弹反");
      if (result.lifestealHeal) extraTags.push("吸" + result.lifestealHeal);
      if (result.reflectDamage) extraTags.push("反伤" + result.reflectDamage);

      if (result.error) {
        summaryParts.push(act.actor + "错误(" + result.error + ")");
      } else if (result.skipped) {
        summaryParts.push(act.actor + "跳过(" + result.reason + ")");
      } else if (result.immune) {
        summaryParts.push(target.name + "免疫" + (act.spell||act.weapon||result.damageType||"攻击"));
      } else if (result.hit === "miss") {
        summaryParts.push(act.actor + "→" + target.name + "未中" + (result.effectiveAC ? "(AC"+result.effectiveAC+")" : ""));
      } else if (result.killed) {
        target._dead = true;
        summaryParts.push(act.actor + (extraTags.length>0?"["+extraTags.join("")+"]":"") + "击杀" + target.name);
      } else if (result.damage > 0) {
        summaryParts.push(act.actor + (extraTags.length>0?"["+extraTags.join("")+"]":"") + "→" + target.name + "(" + result.finalDamage + "伤)");
      }
    }

    // 6. 回合末清算 (DOT/HOT/溃逃检查)
    Combat.data.units.forEach(function(u) {
      if (u.hp <= 0 || u._dead) return;
      u.status.forEach(function(st) {
        var r = resolveStatus(st);
        if (!r || !r.matched) return;
        var eff = r.effect;
        // DOT
        if (eff.dot) {
          var dotDmg = rollStr(eff.dot).total;
          if (Combat.checkImmune(u, eff.dt || "physical")) dotDmg = 0;
          u.hp = Math.max(0, u.hp - dotDmg);
          summaryParts.push(u.name + "(" + st + "-" + dotDmg + "HP)");
        }
        // HOT
        if (eff.hot) {
          var heal = rollStr(eff.hot).total;
          u.hp = Math.min(u.maxhp, u.hp + heal);
          summaryParts.push(u.name + "(+" + heal + "HP)");
        }
      });

      // 溃逃检查
      if (u.side === "enemy" && checkSwarmFlee(u)) {
        u._dead = true;
        u.hp = 0;
        summaryParts.push(u.name + "溃逃!");
      }

      if (u.hp <= 0 && u.side === "enemy") {
        u._dead = true;
        summaryParts.push(u.name + "阵亡");
      }
    });

    // 清理死亡标记
    Combat.data.units.forEach(function(u) { delete u._dead; });

    // 7. 追加摘要 + 保存
    var summaryText = summaryParts.join(" · ") || "无动作";
    Combat.data.summary.push({ round: Combat.data.round + 1, text: summaryText, actions: results });
    Combat.data.round++;
    Combat.save();

    // 8. 更新状态栏 Tab 内容
    COMBAT_LAST_FLOW = buildDetailedFlow(results);
    COMBAT_LAST_SETTLE = buildSettlementTable(results, Combat.data);

    // 生成攻击箭头 (地图Tab)
    COMBAT_MAP_ARROWS = [];
    results.forEach(function(r){
      if (r.damage > 0 && r.actor && r.target) {
        COMBAT_MAP_ARROWS.push({
          from: r.actor,
          to: r.target,
          damage: r.finalDamage || r.damage,
          color: r.killed ? '#ef4444' : (r.hit==='crit'?'#fbbf24':'#f87171')
        });
      }
    });

    refreshCombatBar();

    // 9. 生成叙事 (独立API) 或 模板拼接 (跟随模式)
    $btn.prop("disabled", false).text("生成叙事...");
    var narration = null;
    if (CombatAPI.apiMode === 'separate') {
      narration = await CombatAPI.narrate(Combat.data, results, summaryText);
    }
    if (!narration) {
      narration = buildTemplateSummary(results, Combat.data);
    }
    COMBAT_LAST_NARRATION = narration;
    refreshCombatBar();

    // 10. 注入战斗状态
    injectCombatState(summaryText, narration);

    // 11. 检查战斗是否结束
    var enemyAlive = aliveUnits("enemy").length;
    var allyAlive = aliveUnits("ally").length;
    if (enemyAlive === 0 || allyAlive === 0) {
      toastr.warning("战斗已结束! 请点击「终止」发送结果到聊天。");
    }

  } catch(e) {
    console.error("[Combat] 回合结算失败:", e);
    toastr.error("结算失败: " + e.message);
  } finally {
    $btn.prop("disabled", false).text("下一回合 ▶");
  }
}

async function handleEndCombat() {
  if (!Combat.data || !Combat.data.active) {
    toastr.warning("没有活跃的战斗");
    return;
  }

  // 注入最终结果到聊天
  injectCombatState(null, null, true);

  var summary = Combat.end();
  toastr.success("战斗结束，摘要已发送");

  // 清空临时数据
  COMBAT_LAST_NARRATION = '';
  COMBAT_LAST_FLOW = '';
  COMBAT_LAST_SETTLE = '';

  // 重新渲染状态栏 (待机状态)
  refreshCombatBar();
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 5.5: 聊天注入系统
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function buildPromptInjection(data) {
  if (!data || !data.active) return '';
  var lines = [];
  lines.push('[战斗状态 · 回合' + data.round + '] ' + (data.battleName||"战斗"));
  data.units.forEach(function(u) {
    if (u.hp <= 0) { lines.push('- ' + u.name + ': 💀阵亡'); return; }
    var side = u.side === "ally" ? "友" : (u.side === "enemy" ? "敌" : "中");
    lines.push('- [' + side + '] ' + u.name + ' HP' + u.hp + '/' + u.maxhp + ' AC' + u.ac + (u.status.length > 0 ? ' [' + u.status.join(',') + ']' : ''));
  });
  if (data.env && data.env.length > 0) lines.push('环境: ' + data.env.map(function(e){return e.name;}).join('、'));
  return lines.join('\n');
}

function buildChatMessage(summaryText, narration, isFinal) {
  var lines = [];
  if (isFinal) {
    lines.push('[战斗结束] ' + Combat.data.battleName + ' · 共' + Combat.data.round + '回合');
    lines.push('');
    Combat.data.summary.forEach(function(s) {
      lines.push('R' + s.round + ': ' + s.text);
    });
    // 单位最终状态
    lines.push('');
    lines.push('最终状态:');
    Combat.data.units.forEach(function(u) {
      lines.push('- ' + u.name + ' HP' + u.hp + '/' + u.maxhp + (u.hp <= 0 ? ' 💀' : ''));
    });
  } else {
    lines.push('[战斗 · 回合' + Combat.data.round + '] ' + (narration || summaryText));
  }
  return lines.join('\n');
}

function injectCombatState(summaryText, narration, isFinal) {
  if (CombatAPI.injectMode === 'none') return;
  if (!Combat.data || !Combat.data.active) return;

  var mode = CombatAPI.injectMode;
  var promptText = buildPromptInjection(Combat.data);
  var chatText = buildChatMessage(summaryText, narration, isFinal);

  // 注入为 Prompt 变量
  if (mode === 'prompt' || mode === 'both') {
    try {
      TavernHelper.replaceVariables({ combat_context: promptText });
    } catch(e) { console.warn("[Combat] Prompt注入失败:", e); }
  }

  // 注入为聊天消息
  if (mode === 'message' || mode === 'both') {
    try {
      // 只在终止推演时发送消息，避免每回合刷屏
      if (isFinal) {
        TavernHelper.createChatMessages([{ role: "user", message: chatText }]);
      }
      // 也可以更新一个变量让用户手动发送
      TavernHelper.replaceVariables({ combat_last_result: chatText });
    } catch(e) { console.warn("[Combat] 聊天注入失败:", e); }
  }
}


/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PART 6: 启动
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

(function initCombatV2() {
  if (typeof $ === 'undefined') { setTimeout(initCombatV2, 200); return; }
  if (!document.body) { setTimeout(initCombatV2, 200); return; }
  CombatAPI.loadSettings();
  Combat.load();
  mountCombatBar();
  console.log('[Combat v2] 底部状态栏已挂载 | API模式:' + CombatAPI.apiMode + ' | 注入:' + CombatAPI.injectMode);
})();
