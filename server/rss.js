const RSS = require('rss');
const db = require('./db');

const SITE_URL = process.env.SITE_URL || 'http://localhost:8080';

function generatePostsRSS() {
  const posts = db.prepare(
    "SELECT * FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 50"
  ).all();

  const feed = new RSS({
    title: "Wenhai's Blog",
    description: 'Thoughts, ideas, and the written word',
    feed_url: SITE_URL + '/rss/posts.xml',
    site_url: SITE_URL + '/?section=blogs',
    language: 'zh-CN',
    pubDate: posts.length > 0 ? posts[0].created_at : new Date(),
    ttl: 60,
    custom_namespaces: { content: 'http://purl.org/rss/1.0/modules/content/' }
  });

  posts.forEach(function(post) {
    let tags = [];
    try { tags = JSON.parse(post.tags || '[]'); } catch(e) {}

    feed.item({
      title: post.title,
      description: post.summary || post.content.substring(0, 200),
      url: SITE_URL + '/post/' + post.id,
      categories: tags,
      date: post.created_at,
      custom_elements: [
        { 'content:encoded': post.content }
      ]
    });
  });

  return feed.xml({ indent: true });
}

function generateFeedsRSS() {
  const feeds = db.prepare(
    "SELECT * FROM feeds WHERE status = 'published' ORDER BY created_at DESC LIMIT 50"
  ).all();

  const feed = new RSS({
    title: "Wenhai's Feed",
    description: 'Curated news and insights',
    feed_url: SITE_URL + '/rss/feeds.xml',
    site_url: SITE_URL + '/?section=feed',
    language: 'zh-CN',
    pubDate: feeds.length > 0 ? feeds[0].created_at : new Date(),
    ttl: 30,
    custom_namespaces: { content: 'http://purl.org/rss/1.0/modules/content/' }
  });

  feeds.forEach(function(item) {
    let tags = [];
    try { tags = JSON.parse(item.tags || '[]'); } catch(e) {}

    feed.item({
      title: item.title,
      description: item.summary || item.content.substring(0, 200),
      url: SITE_URL + '/?section=feed&id=' + item.id,
      categories: tags,
      date: item.created_at,
      author: item.source || '',
      custom_elements: [
        { 'content:encoded': item.content }
      ]
    });
  });

  return feed.xml({ indent: true });
}

function generateAllRSS() {
  const posts = db.prepare(
    "SELECT *, 'post' as type FROM posts WHERE status = 'published' ORDER BY created_at DESC LIMIT 25"
  ).all();

  const feeds = db.prepare(
    "SELECT *, 'feed' as type FROM feeds WHERE status = 'published' ORDER BY created_at DESC LIMIT 25"
  ).all();

  const all = posts.concat(feeds).sort(function(a, b) {
    return new Date(b.created_at) - new Date(a.created_at);
  }).slice(0, 50);

  const feed = new RSS({
    title: "Wenhai's Blog - All",
    description: 'Blog posts and curated feed items',
    feed_url: SITE_URL + '/rss/all.xml',
    site_url: SITE_URL,
    language: 'zh-CN',
    pubDate: all.length > 0 ? all[0].created_at : new Date(),
    ttl: 30
  });

  all.forEach(function(item) {
    let tags = [];
    try { tags = JSON.parse(item.tags || '[]'); } catch(e) {}

    var url = item.type === 'post'
      ? SITE_URL + '/post/' + item.id
      : SITE_URL + '/?section=feed&id=' + item.id;

    feed.item({
      title: (item.type === 'feed' ? '[Feed] ' : '') + item.title,
      description: item.summary || item.content.substring(0, 200),
      url: url,
      categories: tags,
      date: item.created_at
    });
  });

  return feed.xml({ indent: true });
}

module.exports = { generatePostsRSS, generateFeedsRSS, generateAllRSS };
