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
import Twitter from 'twit';
import TwitterMedia from 'twitter-media';

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
            access_token: this.config.twitter.oauth.token,
            access_token_secret: this.config.twitter.oauth.secret,
            //bearer_token: this.config.twitter.bearerToken
        });
        this.mediaClient = new TwitterMedia({
            consumer_key: this.config.twitter.consumerApiKey,
            consumer_secretecret: this.config.twitter.consumerApiSecret,
            token: this.config.twitter.oauth.token,
            token_secret: this.config.twitter.oauth.secret,
        });
    }

    send(saleInfo) {
        try {
            console.log('Twitter Sending');
            this.sendTwitter(saleInfo);
            //console.log('Discord Sending');
            //this.sendDiscord(saleInfo);

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
        }).then(response => Buffer.from(response.data, 'binary'));
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

      ${saleInfo.nftInfo.image} 
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

            me.client
                .get('account/verify_credentials', { skip_status: true })
                .catch(function (err) {
                    console.log('caught error', err.stack);
                })
                .then(function (result) {
                    // `result` is an Object with keys "data" and "resp".
                    // `data` and `resp` are the same objects as the ones passed
                    // to the callback.
                    // See https://github.com/ttezel/twit#tgetpath-params-callback
                    // for details.

                    console.log('data', result.data);
                });

            let tweetInfo = me.formatTweet(saleInfo);
            let image = me.getBase64(`${saleInfo.nftInfo.image}`);

            // first we must post the media to Twitter
            me.client.post('media/upload', { media_data: image }, function (err, data, response) {
                // now we can assign alt text to the media, for use by screen readers and
                // other text-based presentations and interpreters
                console.log('image uploaded');

                var mediaIdStr = data.media_id_string;
                var altText = saleInfo.nftInfo.id;
                var meta_params = { media_id: mediaIdStr, alt_text: { text: altText } }

                me.client.post('media/metadata/create', meta_params, function (err, data, response) {
                    if (!err) {
                        console.log('image metadata uploaded');

                        // now we can reference the media and post a tweet (media will attach to the tweet)
                        var params = { status: saleInfo, media_ids: [mediaIdStr] }

                        me.client.post('statuses/update', params, function (err, data, response) {
                            console.log(data);
                        });
                    } else {
                        console.log(err);
                    }
                });
            });
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
