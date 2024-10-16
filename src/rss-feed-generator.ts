import type { Channel, Media } from './telegram-parser.js';
import { getChildren, innerText, isTag, removeElement } from 'domutils';
import render from 'dom-serializer';
import { formatRFC7231 } from 'date-fns';
import type { AnyNode } from 'domhandler';
import type { Writable } from 'stream';
import { HostingUrl } from './hosting-utils.js';

const WhitelistedAttributes = new Set<string>(['href', 'src', 'alt', 'title', 'target', 'rel']);
const DefaultTitleMaxLength = 100;

export async function buildFeed(channel: Channel, stream: Writable, options?: { titleMaxLength?: number }) {
  stream.write(`<?xml version="1.0" encoding="UTF-8"?>\n`);
  stream.write(`<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">`);
  stream.write(`<channel>`);
  stream.write(`<title><![CDATA[${channel.title}]]></title>`);
  stream.write(`<image>`);
  stream.write(`<url><![CDATA[${channel.logoUrl}]]></url>`);
  stream.write(`<title><![CDATA[${channel.title}]]></title>`);
  stream.write(`<link><![CDATA[${channel.link}]]></link>`);
  stream.write(`</image>`);
  const rssLink = HostingUrl || '';
  stream.write(`<link><![CDATA[${rssLink}]]></link>`);
  stream.write(`<description><![CDATA[${channel.description}]]></description>`);
  stream.write(`<generator>Telegram to RSS</generator>`);
  stream.write(`<atom:link href="${rssLink}/rss/${channel.id}" rel="self" type="application/rss+xml" />`);
  const lastUpdated = formatRFC7231(channel.posts[channel.posts.length - 1].date);
  stream.write(`<pubDate>${lastUpdated}</pubDate>`);
  stream.write(`<lastBuildDate>${lastUpdated}</lastBuildDate>`);
  for (const post of channel.posts) {
    stream.write(`<item>`);

    const mediaInfos = post.media.map(getMediaInfo);
    let title = '';
    let description = '';
    if (post.textHtml) {
      const toRender = getChildren(post.textHtml);
      sanitizeDescriptionHtml(toRender);
      description = render(toRender, { xmlMode: false, selfClosingTags: true, encodeEntities: false });
      title = generateTitle(toRender, options?.titleMaxLength || DefaultTitleMaxLength);
    }

    stream.write(`<title><![CDATA[${title}]]></title>`);
    const mediaPreviews = post.media.map(generateMedia).join('<br />');
    stream.write(`<description><![CDATA[${mediaPreviews}<br />${description}]]></description>`);
    stream.write(`<link><![CDATA[${post.link}]]></link>`);
    stream.write(`<guid>t.me/s/${channel.id}/${post.id}</guid>`);
    stream.write(`<pubDate>${formatRFC7231(post.date)}</pubDate>`);
    for (let i = 0; i < post.media.length; i++) {
      const media = post.media[i];
      const mediaInfo = await mediaInfos[i];
      stream.write(`<enclosure url="${media.url}" type="${mediaInfo.type}" length="${mediaInfo.size}" />`);
    }
    stream.write(`</item>`);
  }
  stream.write(`</channel>`);
  stream.write(`</rss>`);
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

async function getMediaInfo(media: Media) {
  const response: any = await fetch(media.url, { method: 'HEAD' });
  return {
    size: Number(response.headers.get('Content-Length')),
    type: response.headers.get('Content-Type') || '',
  };
}

function sanitizeDescriptionHtml(nodes: AnyNode[]) {
  const queue = [...nodes];
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
  const titleParts = [];
  for (const node of descriptionNodes) {
    if (isTag(node) && node.tagName === 'br') {
      if (titleParts.length > 0) {
        break;
      }
    } else {
      titleParts.push(node);
    }
  }
  let title = innerText(titleParts).trim();

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
