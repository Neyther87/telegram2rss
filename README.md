# Telegram to RSS

[![License](https://img.shields.io/github/license/akopachov/sveltab)](/LICENSE)

[RSS feed](https://en.wikipedia.org/wiki/RSS) generator for public [Telegram](https://telegram.org/) channels.
It allows you to stay in tune with any public channel without having an account and being subscribed to that channel.

## Features

* Fast and efficient
* Full media support
* Serverless and Edge compatible
* One-click deployment to [Vercel](https://vercel.com/), [Netlify](https://www.netlify.com/) and [Cloudflare Workers](https://workers.cloudflare.com/)

## Deploy your own instance

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fakopachov%2Ftelegram2rss)

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/akopachov/telegram2rss)

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/akopachov/telegram2rss)

## API endpoints

Main endpoint format is `{deploy_url}/rss/{channel_name}`, where `{deploy_url}` is a URL where application is deployed, `{channel_name}` is a Telegram public channel name. As a response, this endpoint returns the RSS v2.0 feed of the given Telegram channel.

Additionally, it is possible to pass the following optional query string parameters:

* `count` - how many posts should be included in the feed (max: `100`, default: `50`)
* `titleMaxLength` - the maximum length of an RSS item title (default: `100`)

## Want to say thank you?

* Buy me a coffee [here](https://ko-fi.com/akopachov) (No account needed, one-time)
* Become a patron at [Patreon](https://patreon.com/akopachov) (Account needed)
* [Z.Cash](https://z.cash/): `t1PCzJrd96RUfzjzhBERfXEFvSi7W6V86hM`
* [DOGE](https://dogecoin.com/): `DAa3nu1RCWwxZdAnGVga77bgxDFP1nhahj`
* [USDT](https://tether.to): `0xa12163eD56e35d3B38F7087B573384E40b2785e1`
* [TON](https://ton.org/): `UQCSBzoTb1B7RhXnka5RegmdjHR3gQwRVgZHNPPqzjjvlTKW`
