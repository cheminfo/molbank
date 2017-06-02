'use strict';

const xmldom = require('xmldom');
const {DOMParser, XMLSerializer} = xmldom;

const parser = new DOMParser();
const serializer = new XMLSerializer();

module.exports = function parseXML(data) {
    const doc = parser.parseFromString(data);

    const article = {};
    const articleDom = doc.getElementsByTagName('article')[0] || fail('no article');

    const articleMeta = articleDom.getElementsByTagName('article-meta')[0] || fail('no meta');
    const articleIds = articleMeta.getElementsByTagName('article-id');
    for (let i = 0; i < articleIds.length; i++) {
        const articleId = articleIds[i];
        const pubIdType = articleId.getAttribute('pub-id-type');
        if (pubIdType === 'doi') {
            article.doi = articleId.textContent;
        } else if (pubIdType === 'publisher-id') {
            article.publisherId = articleId.textContent;
        }
    }

    const articleType = articleDom.getAttribute('article-type');
    if (articleType === 'editorial') {
        console.error(`Ignoring editorial ${article.publisherId}`);
        return null;
    }

    const articleTitle = articleMeta.getElementsByTagName('article-title')[0] || fail('no title');
    article.title = articleTitle.textContent.trim();

    article.keywords = [];
    const keywords = articleMeta.getElementsByTagName('kwd');
    for (let i = 0; i < keywords.length; i++) {
        const keyword = keywords[i];
        article.keywords.push(keyword.textContent);
    }

    const contribGroup = articleMeta.getElementsByTagName('contrib-group')[0] || fail('no contrib group');
    const contribs = contribGroup.getElementsByTagName('contrib');
    article.authors = [];
    for (let i = 0; i < contribs.length; i++) {
        const contrib = contribs[i];
        if (contrib.getAttribute('contrib-type') === 'author') {
            const author = {};
            const surname = contrib.getElementsByTagName('surname')[0];
            const names = contrib.getElementsByTagName('given-names')[0];
            if (surname) author.surname = surname.textContent;
            if (names) author.names = names.textContent;
            article.authors.push(author);
        }
    }

    const affiliations = articleMeta.getElementsByTagName('aff');
    article.affiliations = [];
    for (let i = 0; i < affiliations.length; i++) {
        const affiliation = affiliations[i];
        article.affiliations.push(affiliation.textContent.trim());
    }

    const pubDates = articleMeta.getElementsByTagName('pub-date');
    for (let i = 0; i < pubDates.length; i++) {
        const pubDate = pubDates[i];
        if (pubDate.getAttribute('pub-type') === 'epub') {
            article.date = {
                day: parseInt(pubDate.getElementsByTagName('day')[0].textContent),
                month: parseInt(pubDate.getElementsByTagName('month')[0].textContent),
                year: parseInt(pubDate.getElementsByTagName('year')[0].textContent),
            };
            break;
        }
    }

    article.volume = parseInt((articleMeta.getElementsByTagName('volume')[0] || fail('no volume')).textContent);
    article.issue = parseInt((articleMeta.getElementsByTagName('issue')[0] || fail('no issue')).textContent);
    article.elocationId = (articleMeta.getElementsByTagName('elocation-id')[0] || fail('no elocation id')).textContent;

    const back = articleDom.getElementsByTagName('back')[0];
    article.suppMaterial = [];
    if (back) {
        const suppMaterial = back.getElementsByTagName('supplementary-material');
        for (let i = 0; i < suppMaterial.length; i++) {
            const id = suppMaterial[i].getAttribute('id');
            article.suppMaterial.push({
                id: id,
                url: `http://www.mdpi.com/1422-8599/${article.volume}/${article.issue}/${article.elocationId}/s${i + 1}`,
                name: suppMaterial[i].getAttribute('xlink:href')
            });
            /*const match = /-s0*(\d+)$/.exec(id);
            let number;
            if (match) {
                number = match[1];
            } else {
                const label = suppMaterial[i].getElementsByTagName('label')[0];
                if (label) {
                    const split = label.textContent.split(/ +/);
                    if (/^\d+$/.test(split[split.length - 1])) {
                        number = split[split.length - 1];
                    }
                }
            }
            if (number) {
                article.suppMaterial.push({
                    id: id,
                    url: `http://www.mdpi.com/1422-8599/${article.volume}/${article.issue}/${article.elocationId}/s${number}`,
                    name: suppMaterial[i].getAttribute('xlink:href')
                });
            } else {
                console.error('Could not identify supplementary material: ' + article.publisherId);
            }*/
        }
    }

    return article;
};

function fail(message) {
    throw new Error(message);
}
