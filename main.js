'use strict'
require('babel-register')
const Wechat = require('./src/wechat.js')
const qrcode = require('qrcode-terminal')
const fs = require('fs')
const request = require('request')
const schedule = require('./schedule/index')
const config = require('./config/index')
const superagent = require('./superagent/superagent.js')
const log4js = require('log4js')
const path = require('path')
// 配置log4js
log4js.configure({
  appenders: {
    // 定义输出方式，例如控制台和文件
    out: { type: 'console' },
    default: {
      type: 'file',
      filename: 'log/run.log',
      maxLogSize: 10485760, // 每个日志文件最大10MB
      backups: 3, // 最多保留3个备份文件
    },
  },
  categories: {
    // 设置默认的logger以及对应的appender
    default: { appenders: ['out', 'default'], level: 'ALL' },
  },
})
const logger = log4js.getLogger(path.basename(__filename))
let bot
/**
 * 尝试获取本地登录数据，免扫码
 * 这里演示从本地文件中获取数据
 */
try {
  bot = new Wechat(require('./sync-data.json'))
} catch (e) {
  bot = new Wechat()
}
initDay().then((r) => console.log('initDay success.'))
// 启动时间
const startTime = new Date()
setTimeout(function () {
  config.startDelayCompleted = true
}, 1000 * 20)

// 延时函数，防止检测出类似机器人行为操作
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// 创建微信每日说定时任务
async function initDay() {
  logger.debug('已经设定每日说任务')

  // 定时任务：每日自动发送新闻
  schedule.setSchedule(config.SendNewsTime, async () => {
    await sendNews()
  })
}

/**
 * 获取最新的新闻列表
 */
async function getLatestNews() {
  // 获取土味情话
  let url = 'http://fei.linyingtech.com/api/v1/latest/news'
  try {
    let res = await superagent.req({ url, method: 'GET' })
    if (res.code === 100) {
      return res.data
    } else {
      return null
    }
  } catch (err) {
    logger.error('获取接口失败', err)
  }
}

/**
 * 发送今日热点新闻
 * @returns {Promise<void>}
 */
async function sendNews() {
  logger.debug('发送今日热点新闻 ' + new Date())
  let newData = await getLatestNews()
  let newsInfo = newData.content
  for (const roomId of config.SendNewsRooms) {
    logger.debug(`群名: ${roomId}`)

    let content = `今日热点 ${newsInfo.calendar.cMonth}月${newsInfo.calendar.cDay}日，${newsInfo.calendar.ncWeek}，`
    content += `农历${newsInfo.calendar.monthCn}${newsInfo.calendar.dayCn}\n`
    let sendCount = 15
    if (newsInfo.newsList.length < sendCount) sendCount = newsInfo.newsList.length
    for (let i = 0; i < sendCount; i++) {
      const oneNew = newsInfo.newsList[i]
      content += `${i + 1}. [${oneNew.category}]${oneNew.title}\n`
    }
    if (newsInfo.sentence !== undefined) {
      content += `\n[心语]${newsInfo.sentence.sentence} -- ${newsInfo.sentence.author}\n`
    }

    // content += `\n更多信息可浏览https://fei.linyingtech.com/news?id=${newData.id}\n关注公众号:[一级码农]，及时获取最新科技娱乐实时新闻。\n`
    content += `\n详细信息可浏览https://fei.linyingtech.com/news?id=${newData.id}\n`
    await delay(100)
    logger.debug('发送今日热点新闻 ', content)
    bot.sendMsg(content, roomId).catch((err) => {
      bot.emit('error', err)
    })
  }
}

/**
 * 启动机器人
 */
if (bot.PROP.uin) {
  // 存在登录数据时，可以随时调用restart进行重启
  bot.restart()
} else {
  bot.start()
}
/**
 * uuid事件，参数为uuid，根据uuid生成二维码
 */
bot.on('uuid', (uuid) => {
  qrcode.generate('https://login.weixin.qq.com/l/' + uuid, {
    small: true,
  })
  logger.debug('二维码链接：', 'https://login.weixin.qq.com/qrcode/' + uuid)
})
/**
 * 登录用户头像事件，手机扫描后可以得到登录用户头像的Data URL
 */
bot.on('user-avatar', (avatar) => {
  logger.debug('登录用户头像Data URL：', avatar)
})
/**
 * 登录成功事件
 */
bot.on('login', () => {
  logger.debug('登录成功')
  // 保存数据，将数据序列化之后保存到任意位置
  fs.writeFileSync('./sync-data.json', JSON.stringify(bot.botData))
})
/**
 * 登出成功事件
 */
bot.on('logout', () => {
  logger.debug('登出成功')
  // 清除数据
  fs.unlinkSync('./sync-data.json')
})
/**
 * 联系人更新事件，参数为被更新的联系人列表
 */
bot.on('contacts-updated', (contacts) => {
  // console.log(contacts)
  for (let i = 0; i < contacts.length; i++) {
    const con = contacts[i]
    logger.debug(`[${i}/${contacts.length}]${con.UserName},${con.NickName},成员数量:${con.MemberCount}`)
    if (!con.NickName) continue

    for (const roomName of config.SendNewsRoomNames) {
      if (con.NickName.indexOf(roomName) >= 0 && config.SendNewsRooms.indexOf(con.UserName) < 0) {
        logger.debug('群发今日热点', roomName, con.NickName, con.UserName)
        config.SendNewsRooms.push(con.UserName)
      }
    }
    // if (con.NickName.indexOf('机器人') >= 0 ||
    //   con.NickName.indexOf('互联网人沟通交流群') >= 0 ||
    //   con.NickName.indexOf('开普老友交流群') >= 0 ||
    //   con.NickName.indexOf('老朋友新天地') >= 0 ||
    //   con.NickName.indexOf('快乐生活理财分享交流群') >= 0 ||
    //   con.NickName.indexOf('正商明钻业主交流群') >= 0 ||
    //   con.NickName.indexOf('正商明钻') >= 0
    // ) {
    //   if (config.SendNewsRooms.indexOf(con.UserName) < 0) {
    //     config.SendNewsRooms.push(con.UserName)
    //   }
    // }
  }
  logger.debug('config.SendNewsRooms：', config.SendNewsRooms)
  logger.debug('联系人数量：', Object.keys(bot.contacts).length)
})
/**
 * 错误事件，参数一般为Error对象
 */
bot.on('error', (err) => {
  logger.error('错误：', err)
})
/**
 * 如何发送消息
 */
bot.on('login', () => {
  /**
   * 演示发送消息到文件传输助手
   * 通常回复消息时可以用 msg.FromUserName
   */

  // let ToUserName = 'filehelper'
  let ToUserName = '@@bbc628d89d74d5e0caff6bf3123aee4febd8804b7472c720e0c6407ced868cba'

  /**
   * 发送文本消息，可以包含emoji(😒)和QQ表情([坏笑])
   */
  bot.sendMsg('发送文本消息，可以包含emoji(😒)和QQ表情([坏笑])', ToUserName).catch((err) => {
    bot.emit('error', err)
  })
  //
  // setInterval(function () {
  //   console.log('interval')
  //   bot.sendMsg('发送文本消息，可以包含emoji(😒)和QQ表情([坏笑])', ToUserName)
  //     .catch(err => {
  //       bot.emit('error', err)
  //     })
  // }, 3000)

  /**
   * 通过表情MD5发送表情
   */
  // bot.sendMsg({
  //   emoticonMd5: '00c801cdf69127550d93ca52c3f853ff'
  // }, ToUserName)
  //   .catch(err => {
  //     bot.emit('error', err)
  //   })

  /**
   * 以下通过上传文件发送图片，视频，附件等
   * 通用方法为入下
   * file为多种类型
   * filename必填，主要为了判断文件类型
   */
  // bot.sendMsg({
  //   file: Stream || Buffer || ArrayBuffer || File || Blob,
  //   filename: 'bot-qrcode.jpg'
  // }, ToUserName)
  //   .catch(err => {
  //     bot.emit('error',err)
  //   })

  /**
   * 发送图片
   */
  // bot.sendMsg({
  //   file: request('https://raw.githubusercontent.com/nodeWechat/wechat4u/master/bot-qrcode.jpg'),
  //   filename: 'bot-qrcode.jpg'
  // }, ToUserName)
  //   .catch(err => {
  //     bot.emit('error', err)
  //   })

  /**
   * 发送表情
   */
  // bot.sendMsg({
  //   file: fs.createReadStream('./media/test.gif'),
  //   filename: 'test.gif'
  // }, ToUserName)
  //   .catch(err => {
  //     bot.emit('error', err)
  //   })

  /**
   * 发送视频
   */
  // bot.sendMsg({
  //   file: fs.createReadStream('./media/test.mp4'),
  //   filename: 'test.mp4'
  // }, ToUserName)
  //   .catch(err => {
  //     bot.emit('error', err)
  //   })

  /**
   * 发送文件
   */
  // bot.sendMsg({
  //   file: fs.createReadStream('./media/test.txt'),
  //   filename: 'test.txt'
  // }, ToUserName)
  //   .catch(err => {
  //     bot.emit('error', err)
  //   })

  // 发送撤回消息请求
  // bot.sendMsg('测试撤回', ToUserName)
  //   .then(res => {
  //     // 需要取得待撤回消息的MsgID
  //     return bot.revokeMsg(res.MsgID, ToUserName)
  //   })
  //   .catch(err => {
  //     console.log(err)
  //   })
})
/**
 * 如何处理会话消息
 */
bot.on('message', (msg) => {
  // 获取消息时间 获取消息发送者的显示名
  const msgLog = `${msg.getDisplayTime()}--${msg.FromUserName}, ${bot.contacts[msg.FromUserName]?.getDisplayName()}`

  // 判断消息类型
  switch (msg.MsgType) {
    case bot.CONF.MSGTYPE_TEXT:
      // 文本消息
      logger.debug(`--Rx TextMsg(${msg.MsgType})：--${msgLog}`)
      logger.debug(msg.Content)
      if (config.startDelayCompleted) {
        if (bot.contacts[msg.FromUserName].getDisplayName() === '朱鹏飞') {
          if (msg.Content === '补发') {
            sendNews().then((r) => console.log('sendNews end'))
          }
        }
      }
      break
    case bot.CONF.MSGTYPE_IMAGE:
      // 图片消息
      logger.debug(`--收到图片消息(${msg.MsgType})：--${msgLog}`)
      // bot.getMsgImg(msg.MsgId).then(res => {
      //   fs.writeFileSync(`./media/${msg.MsgId}.jpg`, res.data)
      // }).catch(err => {
      //   bot.emit('error', err)
      // })
      break
    case bot.CONF.MSGTYPE_VOICE:
      // 语音消息
      logger.debug(`--收到语音消息(${msg.MsgType})：--${msgLog}`)
      // bot.getVoice(msg.MsgId).then(res => {
      //   fs.writeFileSync(`./media/${msg.MsgId}.mp3`, res.data)
      // }).catch(err => {
      //   bot.emit('error', err)
      // })
      break
    case bot.CONF.MSGTYPE_EMOTICON:
      // 表情消息
      logger.debug('表情消息，保存到本地')
      // bot.getMsgImg(msg.MsgId).then(res => {
      //   fs.writeFileSync(`./media/${msg.MsgId}.gif`, res.data)
      // }).catch(err => {
      //   bot.emit('error', err)
      // })
      break
    case bot.CONF.MSGTYPE_VIDEO:
    case bot.CONF.MSGTYPE_MICROVIDEO:
      /**
       * 视频消息
       */
      logger.debug('视频消息，保存到本地')
      // bot.getVideo(msg.MsgId).then(res => {
      //   fs.writeFileSync(`./media/${msg.MsgId}.mp4`, res.data)
      // }).catch(err => {
      //   bot.emit('error', err)
      // })
      break
    case bot.CONF.MSGTYPE_APP:
      if (msg.AppMsgType === 6) {
        // 文件消息
        logger.debug('文件消息，保存到本地')
        // bot.getDoc(msg.FromUserName, msg.MediaId, msg.FileName).then(res => {
        //   fs.writeFileSync(`./media/${msg.FileName}`, res.data)
        //   console.log(res.type)
        // }).catch(err => {
        //   bot.emit('error', err)
        // })
      }
      break
    default:
      break
  }
})

/**
 * 如何处理红包消息
 */
bot.on('message', (msg) => {
  if (msg.MsgType == bot.CONF.MSGTYPE_SYS && /红包/.test(msg.Content)) {
    // 若系统消息中带有‘红包’，则认为是红包消息
    // wechat4u并不能自动收红包
  }
})
/**
 * 如何处理转账消息
 */
bot.on('message', (msg) => {
  if (msg.MsgType == bot.CONF.MSGTYPE_APP && msg.AppMsgType == bot.CONF.APPMSGTYPE_TRANSFERS) {
    // 转账
  }
})
/**
 * 如何处理撤回消息
 */
bot.on('message', (msg) => {
  if (msg.MsgType == bot.CONF.MSGTYPE_RECALLED) {
    // msg.Content是一个xml，关键信息是MsgId
    let MsgId = msg.Content.match(/<msgid>(.*?)<\/msgid>.*?<replacemsg><!\[CDATA\[(.*?)\]\]><\/replacemsg>/)[0]
    // 得到MsgId后，根据MsgId，从收到过的消息中查找被撤回的消息
  }
})
/**
 * 如何处理好友请求消息
 */
bot.on('message', (msg) => {
  if (msg.MsgType == bot.CONF.MSGTYPE_VERIFYMSG) {
    bot
      .verifyUser(msg.RecommendInfo.UserName, msg.RecommendInfo.Ticket)
      .then((res) => {
        logger.debug(`通过了 ${bot.Contact.getDisplayName(msg.RecommendInfo)} 好友请求`)
      })
      .catch((err) => {
        bot.emit('error', err)
      })
  }
})
/**
 * 如何直接转发消息
 */
bot.on('message', (msg) => {
  // 不是所有消息都可以直接转发
  // bot.forwardMsg(msg, 'filehelper')
  //   .catch(err => {
  //     bot.emit('error', err)
  //   })
})

bot.on('message', (msg) => {
  // 获取联系人头像并保存到本地
  // bot
  //   .getHeadImg(bot.contacts[msg.FromUserName].HeadImgUrl)
  //   .then((res) => {
  //     fs.writeFileSync(`./media/${msg.FromUserName}.jpg`, res.data)
  //   })
  //   .catch((err) => {
  //     bot.emit('error', err)
  //   })
})
