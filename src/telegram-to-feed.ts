import { Channel, Media } from './telegram-parser.js';
import { getChildren, innerText, isTag, removeElement } from 'domutils';
import render from 'dom-serializer';
import { formatRFC7231 } from 'date-fns';
import { AnyNode } from 'domhandler';
import { HostingUrl } from './hosting-utils.js';

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
  await stream.write(`<generator>Telegram to RSS</generator>`);
  await stream.write(`<atom:link href="${rssLink}/rss/${channel.id}" rel="self" type="application/rss+xml" />`);
  const lastUpdated = formatRFC7231(channel.posts[channel.posts.length - 1].date);
  await stream.write(`<pubDate>${lastUpdated}</pubDate>`);
  await stream.write(`<lastBuildDate>${lastUpdated}</lastBuildDate>`);
  for (const post of channel.posts) {
    await stream.write(`<item>`);

    const mediaInfos = post.media.map(getMediaInfo);
    let title = '';
    let description = '';
    if (post.textHtml) {
      const toRender = getChildren(post.textHtml);
      sanitizeDescriptionHtml(toRender);
      description = render(toRender, { xmlMode: false, selfClosingTags: true, encodeEntities: false });
      title = generateTitle(toRender, options?.titleMaxLength || DefaultTitleMaxLength);
    }

    await stream.write(`<title><![CDATA[${title}]]></title>`);
    const mediaPreviews = post.media
      .map(m =>
        m.type === 'photo'
          ? `<a href="${m.url}" rel="noopener noreferrer nofollow"><img style="max-width:100%" src="${m.url}" /></a>`
          : `<video style="max-width:100%" controls><source src="${m.url}" /></video>`,
      )
      .join('<br />');
    await stream.write(`<description><![CDATA[${mediaPreviews}<br />${description}]]></description>`);
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
