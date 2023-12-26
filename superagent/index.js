const superagent = require('./superagent')
import 'regenerator-runtime/runtime'
// const config = require('../config/index')
// const cheerio = require('cheerio')
// const {machineIdSync} = require('node-machine-id')
// const crypto = require('crypto')
// let md5 = crypto.createHash('md5')
// let uniqueId = md5.update(machineIdSync()).digest('hex') // 获取机器唯一识别码并MD5，方便机器人上下文关联
// const ONE = 'http://wufazhuce.com/' // ONE的web版网站
// const TXHOST = 'http://api.tianapi.com/txapi/' // 天行host
// const TULINGAPI = 'http://www.tuling123.com/openapi/api' // 图灵1.0接口api

// async function getOne () {
//   // 获取每日一句
//   try {
//     let res = await superagent.req({url: ONE, method: 'GET', spider: true})
//     let $ = cheerio.load(res)
//     let todayOneList = $('#carousel-one .carousel-inner .item')
//     let todayOne = $(todayOneList[0])
//       .find('.fp-one-cita')
//       .text()
//       .replace(/(^\s*)|(\s*$)/g, '')
//     return todayOne
//   } catch (err) {
//     console.log('获取每日一句出错', err)
//     return err
//   }
// }

/**
 * 获取最新的新闻
 */
export async function getLatestNews () {
  // 获取土味情话
  let url = 'http://fei.linyingtech.com/api/v1/latest/news'
  try {
    let res = await superagent.req({url, method: 'GET'})
    if (res.code === 100) {
      return res.data
    } else {
      return null
    }
  } catch (err) {
    console.log('获取接口失败', err)
  }
}

// export default {
//   // getOne,
//   // getTXweather,
//   // getReply,
//   // getSweetWord,
//   // getTuLingReply,
//   // getTXTLReply,
//   // getRubbishType,
//   getLatestNews
// }
// export default async function getLatestNews () {
//   // 获取土味情话
//   let url = 'http://fei.linyingtech.com/api/v1/latest/news'
//   try {
//     let res = await superagent.req({url, method: 'GET'})
//     if (res.code === 100) {
//       return res.data
//     } else {
//       return null
//     }
//   } catch (err) {
//     console.log('获取接口失败', err)
//   }
// }
