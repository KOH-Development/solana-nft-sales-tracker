var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from 'axios';
import Twitter from 'twitter-v2';
/**
 * Twitter uses 3 legged oAuth for certain endpoints.
 * You can get the oauth key and secret by simulating the API calls yourselves.
 * You need a approved developer account.
 */
export default class TwitterAndDiscordHelper {
    constructor(config) {
        this.config = config;
        this.client = new Twitter({
            consumer_key: this.config.twitter.consumerApiKey,
            consumer_secret: this.config.twitter.consumerApiSecret,
            access_token_key: this.config.twitter.oauth.token,
            access_token_secret: this.config.twitter.oauth.secret,
            //bearer_token: this.config.twitter.bearerToken
        });
    }

    send(saleInfo) {
        try {
            this.sendDiscord(saleInfo);
            this.sendTwitter(saleInfo);
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
    getBase64(url) {
        return axios.get(url, {
            responseType: 'arraybuffer'
        }).then(response => Buffer.from(response.data, 'binary').toString('base64'));
    }
    /**
     * Format your tweet, you can use emojis.
     * @param saleInfo
     * @returns
     */
    formatTweet(saleInfo) {
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
    sendTwitter(saleInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const me = this;
            let tweetInfo = me.formatTweet(saleInfo);
            let image = yield me.getBase64(`${saleInfo.nftInfo.image}`);
            let mediaUpload;
            try {
                mediaUpload = yield me.client.post('media/upload', { media_data: image });
            }
            catch (err) {
                console.log(JSON.stringify(err));
                throw err;
            }
            try {
                yield me.client.post('/2/tweets', { text: tweetInfo.status, media: { media_ids: mediaUpload.media_id_string } });
            } catch (err) {
                console.log(JSON.stringify(err));
                throw err;
            }
        });
    }

    _createWebhookData(saleInfo) {
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
    sendDiscord(saleInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            const me = this;
            yield axios.post(this.config.discord.webhookUrl, me._createWebhookData(saleInfo));
        });
    }
}
