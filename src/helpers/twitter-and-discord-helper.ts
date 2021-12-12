import _ from 'lodash';
import axios from 'axios';
import Twitter from 'twitter';
import TwitterMedia from 'twitter-media';

/**
* Just setup a new channel in discord, then go to settings, integrations and created a new webhook
* Set the webhook URL in the config.json.
*/
/**
 * Twitter uses 3 legged oAuth for certain endpoints. 
 * You can get the oauth key and secret by simulating the API calls yourselves.
 * You need a approved developer account.
 */
export default class TwitterAndDiscordHelper {
  config: any;
  client: any;
  mediaClient: any;
  constructor(config: any) {
    this.config = config;
    this.client = new Twitter({
      consumer_key: this.config.twitter.consumerApiKey,
      consumer_secret: this.config.twitter.consumerApiSecret,
      //bearer_token: this.config.twitter.bearerToken,
      access_token_key: this.config.twitter.oauth.token,
      access_token_secret: this.config.twitter.oauth.secret
    });
    this.mediaClient = new TwitterMedia({
      consumer_key: this.config.twitter.consumerApiKey,
      consumer_secretecret: this.config.twitter.consumerApiSecret,
      token: this.config.twitter.oauth.token,
      token_secret: this.config.twitter.oauth.secret,
  });
  }

  async send(saleInfo: any) {
    try {
      this.sendTwitter(saleInfo);
      this.sendDiscord(saleInfo);
      console.log(JSON.stringify(saleInfo), null, 2);
    } catch (err) {
      console.log(JSON.stringify(err));
    }
  }

  /**
   * Downloads image from a URL and returns it in Base64 format.
   * @param url 
   * @returns 
   */
  getBase64(url: string) {
    return axios.get(url, {
      responseType: 'arraybuffer'
    }).then(response => Buffer.from(response.data, 'binary'))
  }

  /**
   * Format your tweet, you can use emojis.
   * @param saleInfo 
   * @returns 
   */
  formatTweet(saleInfo: any) {
    return {
      status: `
${saleInfo.nftInfo.id} purchased for ${saleInfo.saleAmount} S◎L 🐦 
Marketplace 📒 
→ https://magiceden.io/marketplace/oeuvre_ai

@0euvreAI #AIArt #AIGeneratedArt #NFT

Explorer: https://solscan.io/tx/${saleInfo.txSignature}
  `
    };
  }

  /**
   * Creates a formatted tweet, uploads the NFT image to twitter and then posts a status update.
   * @param saleInfo 
   */
  async sendTwitter(saleInfo: any) {
    const me = this;
    //console.log(JSON.stringify(me.client));
    let tweetInfo = me.formatTweet(saleInfo);
    let image = await me.getBase64(`${saleInfo.nftInfo.image}`);
    let mediaUpload;
    try {
      console.log(this.mediaClient.oauth);
      mediaUpload = await me.mediaClient.uploadMedia('image', image);
    } catch (err) {
      console.log(JSON.stringify(err));
      throw err;
    }
    try {
      await me.client.post('/statuses/update.json', { status: tweetInfo.status, media: { media_ids: mediaUpload.media_id_string } });
    } catch (err) {
      console.log(JSON.stringify(err));
      throw err;
    }
  }

  _createWebhookData(saleInfo: any) {
    return {
      "username": "0euvreAI Sales Bot",
      "embeds": [
        {
          "author": {
            "name": "0euvreAI Sales Bot"
          },
          "fields": [
            {
              "name": "Price",
              "value": saleInfo.saleAmount
            },
            {
              "name": "Seller",
              "value": saleInfo.seller,
              "inline": true
            },
            {
              "name": "Buyer",
              "value": saleInfo.buyer,
              "inline": true
            },
            {
              "name": "Transaction ID",
              "value": saleInfo.txSignature,
              "inline": false
            },
            {
              "name": "Marketplace",
              "value": saleInfo.marketPlace,
              "inline": false
            }
          ],
          "color": 14303591,
          "title": `${saleInfo.nftInfo.id} → SOLD`,
          "url": `https://solscan.io/tx/${saleInfo.txSignature}`,
          "thumbnail": {
            "url": `${saleInfo.nftInfo.image}`
          },
          "timestamp": new Date(saleInfo.time * 1000).toISOString()
        }
      ]
    }
  }

  async sendDiscord(saleInfo: any) {
    const me = this;
    await axios.post(this.config.discord.webhookUrl, me._createWebhookData(saleInfo));
  }
}
