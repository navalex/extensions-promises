import { Chapter, ChapterDetails, LanguageCode, Manga, MangaStatus, MangaTile, SearchRequest, TagSection } from "paperback-extensions-common";

export const parseMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: [] }),
    createTagSection({ id: '1', label: 'format', tags: [] })]

    const image: string = $('img', '.img-responsive').attr('src') ?? ""
    const rating: string = $('div', '#item-rating').data('score')
    const titles: string[] = []
    const title = $('.widget-title').first().text().replace('Manga ', '')
    titles.push(title)

    let author = ""
    let artist = ""
    let views = 0
    let status = MangaStatus.ONGOING
    for (const row of $('dl.dl-horizontal dt').toArray()) {
        const elem = $(row)
        switch (elem.text()) {
            case 'Auteur(s)': author = elem.next().find('a').text(); break
            case 'Vues': author = elem.next().text(); break
            case 'Autres noms': {
                const alts = elem.next().text().split(',')
                for (const alt of alts) {
                    titles.push(alt)
                }
                break
            }
            case 'Catégories': {
                for (const genre of elem.next().find('a').toArray()) {
                    const item = $(genre) ?? ""
                    const id = $(genre).attr('href')?.split('/').pop() ?? ''
                    const tag = item.text()
                    tagSections[0].tags.push(createTag({ id: id, label: tag }))
                }
                break
            }
            case 'Statut': {
                const stat = elem.next().find('span').text()
                if (stat.includes('En cours'))
                    status = MangaStatus.ONGOING
                else if (stat.includes('Complete'))
                    status = MangaStatus.COMPLETED
                break
            }
        }
    }

    const desc = $('h5').first().next().html() ?? ""
    return createManga({
        id: mangaId,
        titles,
        image: image.replace(/(https:)?\/\//gi, 'https://'),
        rating: Number(rating),
        status,
        artist,
        author,
        tags: tagSections,
        views,
        desc,
        hentai: false
    })
}

export const parseChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []

    for (const elem of $('ul.chapterszozo li').toArray()) {
        const chapNum = $(elem).find('.chapter-title-rtlrr a').text().split(' ').pop() ?? ''
        const name = $(elem).find('.chapter-title-rtlrr em').text() || undefined
        const time = new Date($(elem).find('.date-chapter-title-rtl').text())

        chapters.push(createChapter({
            id: chapNum,
            mangaId,
            name,
            chapNum: parseInt(chapNum),
            time,
            langCode: LanguageCode.FRENCH
        }))
    }

    return chapters
}

export const parseChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []
    for (const page of $('.viewer-cnt #all img').toArray()) {
        const img = $(page)
        pages.push(img.attr('url') ?? '')
    }

    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages: pages,
        longStrip: false
    })
}

export const generateSearch = (query: SearchRequest): string => {
    const title = query.title?.replace(' ', '+') ?? ''

    return `query=${encodeURI(title)}`
}

interface SearchQuery {
    suggestions: Array<SearchItemQuery>;
}

interface SearchItemQuery {
    value: string;
    data: string;
}

export const parseSearch = (data: SearchQuery): MangaTile[] => {
    const mangas: MangaTile[] = []
    for (const item of data.suggestions) {
        mangas.push(createMangaTile({
            id: item.data,
            image: `https://scan-fr.cc/uploads/manga/${item.data}/cover/cover_250x350.jpg`,
            title: createIconText({ text: item.value }),
        }))
    }

    return mangas
}
