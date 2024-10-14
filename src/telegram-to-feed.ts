import { Readable } from 'stream';
import { Channel, Media } from './telegram-parser';
import { getChildren, isTag, removeElement } from 'domutils';
import render from 'dom-serializer';
import { AnyNode } from 'domhandler';

const WhitelistedAttributes = new Set<string>(['href', 'src', 'alt', 'title', 'target', 'rel']);

export async function buildFeed(channel: Channel, stream: Readable) {
  stream.push(`<?xml version="1.0" encoding="UTF-8"?>\n`);
  stream.push(`<rss xmlns:atom="http://www.w3.org/2005/Atom" version="2.0">`);
  stream.push(`<channel>`);
  stream.push(`<title><![CDATA[${channel.title}]]></title>`);
  stream.push(`<image>`);
  stream.push(`<url><![CDATA[${channel.logoUrl}]]></url>`);
  stream.push(`<title><![CDATA[${channel.title}]]></title>`);
  stream.push(`<link><![CDATA[${channel.link}]]></link>`);
  stream.push(`</image>`);
  const rssLink = process.env.HOSTING_URL || '';
  stream.push(`<link><![CDATA[${rssLink}]]></link>`);
  stream.push(`<description><![CDATA[${channel.description}]]></description>`);
  stream.push(`<generator>Telegram to RSS</generator>`);
  stream.push(`<atom:link href="${rssLink}/rss/${channel.id}" rel="self" type="application/rss+xml" />`);
  const lastUpdated = channel.posts[channel.posts.length - 1].date.toISOString();
  stream.push(`<pubDate>${lastUpdated}</pubDate>`);
  stream.push(`<lastBuildDate>${lastUpdated}</lastBuildDate>`);
  for (const post of channel.posts) {
    stream.push(`<item>`);

    const mediaInfos = post.media.map(getMediaInfo);
    let title = '';
    let description = '';
    if (post.textHtml) {
      const toRender = getChildren(post.textHtml);
      sanitizeDescriptionHtml(toRender);
      description = render(toRender, { xmlMode: false, selfClosingTags: true, encodeEntities: false });
      const titleSeparatorMatch = /<br\s*\/?>/gi.exec(description);
      title = description;
      if (titleSeparatorMatch) {
        title = description.slice(0, titleSeparatorMatch.index);
      }
    }

    stream.push(`<title><![CDATA[${title}]]></title>`);
    const mediaPreviews = post.media
      .map(m =>
        m.type === 'photo'
          ? `<a href="${m.url}"><img src="${m.url}" /></a>`
          : `<video controls><source src="${m.url}" /></video>`,
      )
      .join('<br />');
    stream.push(`<description><![CDATA[${mediaPreviews}<br />${description}]]></description>`);
    stream.push(`<link><![CDATA[${post.link}]]></link>`);
    stream.push(`<guid>${post.id}</guid>`);
    stream.push(`<pubDate>${post.date.toISOString()}</pubDate>`);
    for (let i = 0; i < post.media.length; i++) {
      const media = post.media[i];
      const mediaInfo = await mediaInfos[i];
      stream.push(`<enclosure url="${media.url}" type="${mediaInfo.type}" length="${mediaInfo.size}" />`);
    }
    stream.push(`</item>`);
  }
  stream.push(`</channel>`);
  stream.push(`</rss>`);
  stream.push(null);
}

async function getMediaInfo(media: Media) {
  const response = await fetch(media.url, { method: 'HEAD' });
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
