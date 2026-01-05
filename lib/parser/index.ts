import JSZip from 'jszip';

export interface EPUBMetadata {
    title: string;
    authors: string[];
    publisher?: string;
    language?: string;
    description?: string;
    publicationDate?: string;
}

export interface EPUBTocItem {
    id: string;
    title: string;
    href: string;
    children?: EPUBTocItem[];
    level: number;
}

export interface EPUBPage {
    id: string;
    href: string;
    content: string;
    title?: string;
}

export interface EPUBContent {
    metadata: EPUBMetadata;
    toc: EPUBTocItem[];
    pages: EPUBPage[];
    coverImage?: Blob;
}

export async function parseEPUB(file: ArrayBuffer | Uint8Array): Promise<EPUBContent> {
    const zip = await JSZip.loadAsync(file);

    const containerPath = 'META-INF/container.xml';
    const containerContent = await zip.file(containerPath)?.async('text');
    if (!containerContent) {
        throw new Error('Invalid EPUB: Missing container.xml');
    }

    const opfPathMatch = containerContent.match(/full-path="([^"]+)"/);
    if (!opfPathMatch) {
        throw new Error('Invalid EPUB: Could not find OPF file path');
    }

    const opfPath = opfPathMatch[1];
    const opfContent = await zip.file(opfPath)?.async('text');
    if (!opfContent) {
        throw new Error(`Invalid EPUB: Could not find OPF file at ${opfPath}`);
    }

    const metadata = parseOPFMetadata(opfContent);
    const spineItems = parseOPFSpine(opfContent);
    const coverImagePath = getCoverImagePath(opfContent);
    const ncxPath = findNCXPath(opfContent, opfPath);
    const ncxContent = await zip.file(ncxPath)?.async('text');
    const toc = ncxContent ? parseNCXToc(ncxContent) : [];

    let coverImage: Blob | undefined;
    if (coverImagePath) {
        const resolvedCoverPath = resolvePath(opfPath, coverImagePath);
        const coverFile = zip.file(resolvedCoverPath);
        if (coverFile) {
            coverImage = await coverFile.async('blob');
        }
    }

    const pages: EPUBPage[] = await Promise.all(
        spineItems.map(async (item) => {
            const itemPath = resolvePath(opfPath, item.href);
            const content = await zip.file(itemPath)?.async('text') || '';
            return {
                id: item.id,
                href: item.href,
                content: extractTextFromHTML(content),
                title: extractTitleFromHTML(content)
            };
        })
    );

    return {
        metadata,
        toc,
        pages,
        coverImage
    };
}

function parseOPFMetadata(opfContent: string): EPUBMetadata {
    const metadata: EPUBMetadata = {
        title: 'Unknown Title',
        authors: []
    };

    const titleMatch = opfContent.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
    if (titleMatch) {
        metadata.title = stripHTML(titleMatch[1]);
    }

    const authorMatches = opfContent.matchAll(/<dc:creator[^>]*>([\s\S]*?)<\/dc:creator>/gi);
    metadata.authors = Array.from(authorMatches).map(match => stripHTML(match[1]));

    const publisherMatch = opfContent.match(/<dc:publisher[^>]*>([\s\S]*?)<\/dc:publisher>/i);
    if (publisherMatch) {
        metadata.publisher = stripHTML(publisherMatch[1]);
    }

    const languageMatch = opfContent.match(/<dc:language[^>]*>([\s\S]*?)<\/dc:language>/i);
    if (languageMatch) {
        metadata.language = stripHTML(languageMatch[1]);
    }

    const descriptionMatch = opfContent.match(/<dc:description[^>]*>([\s\S]*?)<\/dc:description>/i);
    if (descriptionMatch) {
        metadata.description = stripHTML(descriptionMatch[1]);
    }

    const dateMatch = opfContent.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    if (dateMatch) {
        metadata.publicationDate = stripHTML(dateMatch[1]);
    }

    return metadata;
}

function parseOPFSpine(opfContent: string): Array<{ id: string, href: string }> {
    const items: Array<{ id: string, href: string }> = [];

    const manifestItems: Record<string, string> = {};
    const manifestMatch = opfContent.match(/<manifest[\s\S]*?<\/manifest>/i);
    if (manifestMatch) {
        const itemMatches = manifestMatch[0].matchAll(/<item[^>]*>/gi);
        for (const itemMatch of itemMatches) {
            const idMatch = itemMatch[0].match(/id="([^"]+)"/);
            const hrefMatch = itemMatch[0].match(/href="([^"]+)"/);
            if (idMatch && hrefMatch) {
                manifestItems[idMatch[1]] = hrefMatch[1];
            }
        }
    }

    const spineMatch = opfContent.match(/<spine[\s\S]*?<\/spine>/i);
    if (spineMatch) {
        const itemrefMatches = spineMatch[0].matchAll(/<itemref[^>]*>/gi);
        for (const itemrefMatch of itemrefMatches) {
            const idrefMatch = itemrefMatch[0].match(/idref="([^"]+)"/);
            if (idrefMatch && manifestItems[idrefMatch[1]]) {
                items.push({
                    id: idrefMatch[1],
                    href: manifestItems[idrefMatch[1]]
                });
            }
        }
    }

    return items;
}

function findNCXPath(opfContent: string, opfPath: string): string {
    const ncxMatch = opfContent.match(/<item[^>]*properties="nav"[^>]*href="([^"]+)"[^>]*>/i) ||
        opfContent.match(/<item[^>]*href="([^"]+)"[^>]*media-type="application\/x-dtbncx\+xml"[^>]*>/i);

    if (ncxMatch) {
        return resolvePath(opfPath, ncxMatch[1]);
    }

    return resolvePath(opfPath, 'toc.ncx');
}

function getCoverImagePath(opfContent: string): string | null {
    const manifestItems: Record<string, string> = {};
    const manifestMatch = opfContent.match(/<manifest[\s\S]*?<\/manifest>/i);
    if (manifestMatch) {
        const itemMatches = manifestMatch[0].matchAll(/<item[^>]*>/gi);
        for (const itemMatch of itemMatches) {
            const idMatch = itemMatch[0].match(/id="([^"]+)"/);
            const hrefMatch = itemMatch[0].match(/href="([^"]+)"/);
            if (idMatch && hrefMatch) {
                manifestItems[idMatch[1]] = hrefMatch[1];
            }
        }
    }

    let coverId: string | null = null;

    const coverItemMatch = opfContent.match(/<item[^>]*properties="cover-image"[^>]*id="([^"]+)"[^>]*>/i);
    if (coverItemMatch) {
        coverId = coverItemMatch[1];
    } else {
        const metaCoverMatch = opfContent.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"[^>]*>/i);
        if (metaCoverMatch) {
            coverId = metaCoverMatch[1];
        }
    }

    if (coverId && manifestItems[coverId]) {
        return manifestItems[coverId];
    }

    return null;
}

function parseNCXToc(ncxContent: string): EPUBTocItem[] {
    const toc: EPUBTocItem[] = [];

    const navMapMatch = ncxContent.match(/<navMap[\s\S]*?<\/navMap>/i);
    if (!navMapMatch) return toc;

    const parseNavPoint = (navPointMatch: RegExpMatchArray | string, level: number = 1): EPUBTocItem => {
        const matchStr = navPointMatch[0];
        const idMatch = matchStr.match(/id="([^"]+)"/);
        const navLabelMatch = matchStr.match(/<navLabel[\s\S]*?<text>([\s\S]*?)<\/text>[\s\S]*?<\/navLabel>/i);
        const contentMatch = matchStr.match(/<content[^>]*src="([^"]+)"[^>]*>/i);
        const childrenMatch = matchStr.match(/<navPoint[\s\S]*?<\/navPoint>/gi);

        const item: EPUBTocItem = {
            id: idMatch ? idMatch[1] : `item-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: navLabelMatch ? stripHTML(navLabelMatch[1]) : 'Untitled',
            href: contentMatch ? contentMatch[1] : '',
            level
        };

        if (childrenMatch) {
            item.children = childrenMatch.map(childMatch => parseNavPoint(childMatch, level + 1));
        }

        return item;
    };

    const navPointMatches = navMapMatch[0].matchAll(/<navPoint[\s\S]*?<\/navPoint>/gi);
    for (const navPointMatch of navPointMatches) {
        toc.push(parseNavPoint(navPointMatch));
    }

    return toc;
}

function extractTextFromHTML(html: string): string {
    let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

    text = text.replace(/<\/?(p|div|br|hr|h[1-6])[^>]*>/gi, '\n');
    text = text.replace(/<[^>]*>/g, '');

    text = text.replace(/&nbsp;/g, ' ');
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");

    text = text.replace(/\s+/g, ' ');
    text = text.trim();

    return text;
}

function extractTitleFromHTML(html: string): string | undefined {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) {
        return stripHTML(titleMatch[1]);
    }
    return undefined;
}

function stripHTML(html: string): string {
    return html.replace(/<[^>]*>/g, '').trim();
}

function resolvePath(basePath: string, relativePath: string): string {
    const baseParts = basePath.split('/').filter(Boolean);
    baseParts.pop();

    const relativeParts = relativePath.split('/').filter(Boolean);

    for (const part of relativeParts) {
        if (part === '..') {
            baseParts.pop();
        } else if (part !== '.') {
            baseParts.push(part);
        }
    }

    return baseParts.join('/');
}
