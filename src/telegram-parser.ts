import * as htmlparser2 from 'htmlparser2';
import * as CSSselect from 'css-select';
import type { Document, Element } from 'domhandler';
import { innerText } from 'domutils';
import { innerTextEx } from './domutils-extensions.js';

export type Media = {
  type: 'photo' | 'video' | 'audio';
  url: string;
};

export type Poll = {
  title: Element | null;
  options: {
    text: string;
    percent: number;
  }[];
};

export type Reply = {
  textHtml: Element | null;
  author: string;
  link: string;
};

export type Post = {
  textHtml: Element | null;
  link: string;
  date: Date;
  id: number;
  media: Media[];
  poll?: Poll;
  reply?: Reply;
};

export type ChannelInfo = {
  id: string;
  logoUrl: string;
  title: string;
  link: string;
  description: string;
};

export type Channel = ChannelInfo & {
  posts: Post[];
};

const MessageSelector = CSSselect.compile('.tgme_widget_message_wrap');
const MessageContainerSelector = CSSselect.compile('.tgme_widget_message');
const MessageTextSelector = CSSselect.compile(
  '.tgme_widget_message_bubble > .tgme_widget_message_text,.tgme_widget_message_bubble > .media_supported_cont .tgme_widget_message_text',
);
const MessageReplySelector = CSSselect.compile('.tgme_widget_message_bubble > .tgme_widget_message_reply');
const MessageDateSelector = CSSselect.compile('.tgme_widget_message_date .time');
const MessageMediaSelector = CSSselect.compile(
  '.tgme_widget_message_photo_wrap,.tgme_widget_message_video_wrap video,.tgme_widget_message_roundvideo_wrap video,.tgme_widget_message_voice_player audio',
);
const ChannelTitleSeceltor = CSSselect.compile('.tgme_channel_info_header_title');
const ChannelDescriptionSelector = CSSselect.compile('.tgme_channel_info_description');
const ChannelLogoSelector = CSSselect.compile('.tgme_channel_info_header .tgme_page_photo_image img');
const MessageNotSupportedSelector = CSSselect.compile(
  '.tgme_widget_message_bubble > .message_media_not_supported_wrap',
);
const MessagePollSelector = CSSselect.compile('.tgme_widget_message_poll');
const MessagePollTitleSelector = CSSselect.compile('.tgme_widget_message_poll_question');
const MessagePollOptionSelector = CSSselect.compile('.tgme_widget_message_poll_option');
const MessagePollOptionPercentSelector = CSSselect.compile('.tgme_widget_message_poll_option_percent');
const MessagePollOptionTextSelector = CSSselect.compile('.tgme_widget_message_poll_option_text');

async function getChannelContent(channel: string, options?: { before?: number; after?: number }) {
  if (!channel) {
    throw new Error('Channel is required');
  }
  if (channel.startsWith('@')) {
    channel = channel.slice(1);
  }
  const requestUrl = new URL(`https://t.me/s/${channel}`);
  if (options?.before) {
    requestUrl.searchParams.set('before', options.before.toString());
  }
  if (options?.after) {
    requestUrl.searchParams.set('after', options.after.toString());
  }
  const response: any = await fetch(requestUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch channel: ${channel}`);
  }
  if (response.redirected) {
    throw new Error(`Unknown channel: ${channel}`);
  }
  const rawHtml = await response.text();
  return htmlparser2.parseDocument(rawHtml);
}

function parseChannelInfo(channel: string, $html: Document): ChannelInfo {
  const $title = CSSselect.selectOne(ChannelTitleSeceltor, $html);
  const $description = CSSselect.selectOne(ChannelDescriptionSelector, $html);
  const $channelLogo = CSSselect.selectOne(ChannelLogoSelector, $html) as unknown as Element;
  return {
    id: channel,
    title: innerText($title!),
    link: `https://t.me/s/${channel}`,
    description: innerTextEx($description!, ' '),
    logoUrl: $channelLogo.attribs['src'] || '',
  };
}

function parseChannelPosts($html: Document): Post[] {
  const $messages = CSSselect.selectAll(MessageSelector, $html);
  if ($messages.length === 1 && CSSselect.selectOne('.tme_no_messages_found', $messages[0]) !== null) {
    return [];
  }

  const posts: Post[] = [];
  for (const $message of $messages) {
    const $container = CSSselect.selectOne(MessageContainerSelector, $message) as unknown as Element;
    if (!$container) continue;
    if (CSSselect.selectOne(MessageNotSupportedSelector, $container)) continue;
    const $date = CSSselect.selectOne(MessageDateSelector, $container);
    if (!$date) continue;
    const relativeRef = $container.attribs!['data-post'];
    const $text = CSSselect.selectOne(MessageTextSelector, $container);

    posts.push({
      textHtml: $text,
      link: `https://t.me/s/${relativeRef}`,
      date: new Date($date!.attribs!.datetime),
      id: Number(relativeRef.split('/')[1]),
      media: parsePostMedia($container),
      poll: parsePostPool($container),
      reply: parsePostReply($container),
    });
  }

  return posts;
}

function parsePostMedia(container: Element): Media[] {
  const $media = CSSselect.selectAll(MessageMediaSelector, container);
  const media: Media[] = [];
  for (const $m of $media) {
    if ($m.tagName.toLowerCase() == 'video') {
      media.push({
        type: 'video',
        url: $m.attribs!.src,
      });
    } else if ($m.tagName.toLowerCase() == 'audio') {
      media.push({
        type: 'audio',
        url: $m.attribs!.src,
      });
    } else {
      const style = $m.attribs!.style;
      const match = /background-image:\s*url\('?(.*)'?\)/.exec(style);
      if (match) {
        media.push({
          type: 'photo',
          url: match[1],
        });
      }
    }
  }

  return media;
}

function parsePostPool(container: Element): Poll | undefined {
  const $pollContainer = CSSselect.selectOne(MessagePollSelector, container);
  if ($pollContainer) {
    const $title = CSSselect.selectOne(MessagePollTitleSelector, $pollContainer);
    const poll: Poll = {
      title: $title,
      options: [],
    };

    const $options = CSSselect.selectAll(MessagePollOptionSelector, $pollContainer);
    for (const $option of $options) {
      const $percent = CSSselect.selectOne(MessagePollOptionPercentSelector, $option);
      const $text = CSSselect.selectOne(MessagePollOptionTextSelector, $option);
      if ($text && $percent) {
        poll!.options.push({
          text: innerText($text),
          percent: $percent ? parseInt(innerText($percent), 10) : 0,
        });
      }
    }

    return poll;
  }

  return undefined;
}

function parsePostReply(container: Element): Reply | undefined {
  const $reply = CSSselect.selectOne(MessageReplySelector, container);
  if ($reply) {
    const $replyText = CSSselect.selectOne('.tgme_widget_message_text,.tgme_widget_message_metatext', $reply);
    const $replyAuthor = CSSselect.selectOne('.tgme_widget_message_author', $reply);
    return {
      textHtml: $replyText,
      author: $replyAuthor ? innerText($replyAuthor) : '',
      link: ensureTLinkIsWebLink($reply.attribs!.href),
    };
  }

  return undefined;
}

function ensureTLinkIsWebLink(link: string) {
  const url = new URL(link);
  if (url.hostname.toLowerCase() === 't.me' && !url.pathname.toLowerCase().startsWith('/s/')) {
    url.pathname = `/s${url.pathname}`;
    return url.toString();
  }

  return link;
}

export async function getChannelInfoWithPosts(channel: string, options?: { count?: number }): Promise<Channel> {
  let content = await getChannelContent(channel);
  const channelInfo = parseChannelInfo(channel, content);
  let posts = parseChannelPosts(content);
  if (!!options?.count && posts.length > 0 && posts.length < options.count) {
    while (posts.length < options.count) {
      const oldestPost = posts[0];
      content = await getChannelContent(channel, { before: oldestPost.id });
      const olderPosts = parseChannelPosts(content);
      if (olderPosts.length === 0) {
        break;
      }
      posts = [...olderPosts, ...posts];
    }
  }

  if (options?.count && posts.length > options.count) {
    posts = posts.slice(posts.length - options.count);
  }

  return {
    ...channelInfo,
    posts: posts,
  };
}
