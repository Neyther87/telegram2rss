import type { Channel, Media, Poll, Reply } from './telegram-parser.js';
import { getChildren, isTag, removeElement } from 'domutils';
import render from 'dom-serializer';
import { formatRFC7231 } from 'date-fns';
import type { AnyNode } from 'domhandler';
import { HostingUrl } from './hosting-utils.js';
import { innerTextUntil } from './domutils-extensions.js';

const WhitelistedAttributes = new Set<string>(['href', 'src', 'alt', 'title', 'target', 'rel']);
const DefaultTitleMaxLength = 100;

export type WritableStreamLike = {
  write(input: string): Promise<WritableStreamLike>;
};

export async function buildFeed(channel: Channel, stream: WritableStreamLike, options?: { titleMaxLength?: number }) {
  await stream.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
  await stream.write(`<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">`);
  await stream.write(`<channel>`);
  await stream.write(`<title><![CDATA[${channel.title}]]></title>`);
  await stream.write(`<image>`);
  await stream.write(`<url><![CDATA[${channel.logoUrl}]]></url>`);
  await stream.write(`<title><![CDATA[${channel.title}]]></title>`);
  await stream.write(`<link><![CDATA[${channel.link}]]></link>`);
  await stream.write(`</image>`);
  const rssLink = HostingUrl || '';
  await stream.write(`<link><![CDATA[${rssLink}]]></link>`);
  await stream.write(`<description><![CDATA[${channel.description}]]></description>`);
  await stream.write(`<generator>Telegram to RSS (https://github.com/akopachov/telegram2rss)</generator>`);
  await stream.write(`<atom:link href="${rssLink}/rss/${channel.id}" rel="self" type="application/rss+xml" />`);
  const lastUpdated = formatRFC7231(channel.posts[channel.posts.length - 1].date);
  await stream.write(`<pubDate>${lastUpdated}</pubDate>`);
  await stream.write(`<lastBuildDate>${lastUpdated}</lastBuildDate>`);
  for (const post of channel.posts) {
    await stream.write(`<item>`);

    const mediaInfos = post.media.map(getMediaInfo);
    let title = '';
    let description = '';
    let poll = '';
    let reply = '';
    if (post.textHtml) {
      const toRender = getChildren(post.textHtml);
      sanitizeHtml(toRender);
      description = render(toRender, { xmlMode: false, selfClosingTags: true, encodeEntities: false });
      title = generateTitle(toRender, options?.titleMaxLength || DefaultTitleMaxLength);
    }
    if (post.poll) {
      if (!title && post.poll.title) {
        title = generateTitle(getChildren(post.poll.title), options?.titleMaxLength || DefaultTitleMaxLength);
      }
      poll = generatePoll(post.poll);
    }

    if (post.reply) {
      reply = generateReply(post.reply);
    }

    await stream.write(`<title><![CDATA[${title}]]></title>`);
    const mediaPreviews = post.media.map(generateMedia).join('<br />');
    const combinedDescription = [mediaPreviews, description, poll].filter(e => !!e).join('<br />');
    await stream.write(`<description><![CDATA[${reply}${combinedDescription}]]></description>`);
    await stream.write(`<link><![CDATA[${post.link}]]></link>`);
    await stream.write(`<guid>t.me/s/${channel.id}/${post.id}</guid>`);
    await stream.write(`<pubDate>${formatRFC7231(post.date)}</pubDate>`);
    for (let i = 0; i < post.media.length; i++) {
      const media = post.media[i];
      const mediaInfo = await mediaInfos[i];
      await stream.write(`<enclosure url="${media.url}" type="${mediaInfo.type}" length="${mediaInfo.size}" />`);
    }
    await stream.write(`</item>`);
  }
  await stream.write(`</channel>`);
  await stream.write(`</rss>`);
}

function generateMedia(media: Media) {
  switch (media.type) {
    case 'photo':
      return `<a href="${media.url}" rel="noopener noreferrer nofollow"><img style="max-width:100%" src="${media.url}" /></a>`;
    case 'video':
      return `<video style="max-width:100%" controls><source src="${media.url}" /></video>`;
    case 'audio':
      return `<audio src="${media.url}" style="max-width:100%" controls></audio>`;
    default:
      return '';
  }
}

function generatePoll(poll: Poll) {
  const toRender = poll.title ? getChildren(poll.title) : [];
  sanitizeHtml(toRender);
  const title = render(toRender, { xmlMode: false, selfClosingTags: true, encodeEntities: false }) || '';
  const parts = [`<div><div>${title}</div><table style="border-spacing: 1rem 0;"><tbody>`];
  for (const option of poll.options) {
    parts.push(`<tr><td>${option.percent}&percnt;</td><td>${option.text}</td></tr>`);
  }
  parts.push('</tbody></table></div>');
  return parts.join('');
}

function generateReply(reply: Reply) {
  let replyText = '';
  if (reply.textHtml) {
    const toRender = getChildren(reply.textHtml);
    sanitizeHtml(toRender);
    replyText = render(toRender, { xmlMode: false, selfClosingTags: true, encodeEntities: false });
  }
  return `<a href="${reply.link}" rel="noopener noreferrer nofollow"><blockquote style="padding-left:6px;margin:0;border-left:3px solid #64b5ef;font-style:normal;" cite="${reply.link}"><h4 style="font-weight:600;color:LinkText;margin:0;">${reply.author}</h4><p style="white-space:nowrap;text-overflow:ellipsis;overflow:hidden;margin:0;color:initial;">${replyText}<p></blockquote></a>`;
}

async function getMediaInfo(media: Media) {
  const response: any = await fetch(media.url, { method: 'HEAD' });
  return {
    size: Number(response.headers.get('Content-Length')),
    type: response.headers.get('Content-Type') || '',
  };
}

function sanitizeHtml(nodes: AnyNode | AnyNode[]) {
  const queue = Array.isArray(nodes) ? [...nodes] : [nodes];
  while (queue.length > 0) {
    const node = queue.shift()!;
    if (isTag(node)) {
      const children = getChildren(node);
      queue.push(...children);
      if (children.length === 0 && node.tagName !== 'br') {
        removeElement(node);
      }

      for (const attribute of Object.keys(node.attribs)) {
        if (!WhitelistedAttributes.has(attribute.toLowerCase())) {
          delete node.attribs[attribute];
        }
      }
    }
  }
}

function generateTitle(descriptionNodes: AnyNode[], maxLength: number) {
  let title = innerTextUntil(descriptionNodes, 'br').trim();

  if (title.length > maxLength) {
    const endOfSentence = /[.!?]+\s/gi;
    let lastIndexInRange = title.length;
    let match;
    while ((match = endOfSentence.exec(title)) != null) {
      if (match.index > maxLength) {
        if (match.index < lastIndexInRange) {
          lastIndexInRange = match.index;
        }
        break;
      }
      lastIndexInRange = match.index;
    }

    if (lastIndexInRange > 0 && lastIndexInRange < title.length) {
      title = title.slice(0, lastIndexInRange + 1);
    }
  }

  return title;
}
