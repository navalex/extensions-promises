import {
    Chapter,
    ChapterDetails,
    HomeSection,
    LanguageCode,
    Manga,
    MangaStatus,
    MangaTile,
    Tag,
    TagSection
} from "paperback-extensions-common";


function getMangaThumbnail(mangaID: string | undefined) {
    return "https://scanmanga-vf.ws/uploads/manga/" + mangaID + ".jpg"
}

///////////////////////////////
/////    MANGA DETAILS    /////
///////////////////////////////

export const parseMangaScanMangaDetails = ($: CheerioStatic, mangaId: string): Manga => {
    let titles = [decodeHTMLEntity($('.widget-title').eq(0).text().trim())]
    const image = ($('.img-responsive').attr('src') ?? "").split("/")[0] == "https:" ? $('.img-responsive').attr('src') ?? "" : "https:" + $('.img-responsive').attr('src') ?? ""

    const panel = $('.dl-horizontal')

    let status = MangaStatus.UNKNOWN
    switch ($('dt:contains("Statut")', panel).next().text().trim()) {
        case "Ongoing":
            status = MangaStatus.ONGOING
            break;
        case "Completed":
            status = MangaStatus.COMPLETED
            break;
    }

    let othersTitles = $('dt:contains("Autres noms")', panel).next().text().trim().split(',')
    for (let title of othersTitles) {
        titles.push(decodeHTMLEntity(title.trim()))
    }
    const author = $('dt:contains("Auteur(s)")', panel).next().text().trim() != "" ? $('dt:contains("Auteur(s)")', panel).next().text().trim() : "Unknown"
    const artist = $('dt:contains("Artist(s)")', panel).next().text().trim() != "" ? $('dt:contains("Artist(s)")', panel).next().text().trim() : "Unknown"

    const arrayTags: Tag[] = []
    // Categories
    if ($('dt:contains("Catégories")', panel).length > 0) {
        const categories = $('dt:contains("Catégories")', panel).next().text().trim().split(',') ?? ""
        for (const category of categories) {
            const label = capitalizeFirstLetter(decodeHTMLEntity(category.trim()))
            const id = category.replace(" ", "-").toLowerCase().trim() ?? label

            arrayTags.push({ id: id, label: label })
        }
    }
    // Tags
    if ($('dt:contains("Tags")', panel).length > 0) {
        const tags = $('dt:contains("Tags")', panel).next().text().trim().split('\n') ?? ""
        for (const tag of tags) {
            const label = tag.trim()
            const id = tag.replace(" ", "-").toLowerCase().trim() ?? label

            if (!arrayTags.includes({ id: id, label: label })) {
                arrayTags.push({ id: id, label: label })
            }
        }
    }
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.length > 0 ? arrayTags.map(x => createTag(x)) : [] })];

    const views = Number($('dt:contains("Vues")', panel).next().text().trim())
    const rating = Number($('dt:contains("Note")', panel).next().children().text().trim().substr(11, 3)) ?? ''
    const desc = decodeHTMLEntity($('.well').children('p').text().trim())

    return createManga({
        id: mangaId,
        titles,
        image,
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


//////////////////////////
/////    CHAPTERS    /////
//////////////////////////

export const parseMangaScanChapters = ($: CheerioStatic, mangaId: string): Chapter[] => {
    const chapters: Chapter[] = []

    for (let chapter of $('.chapters li:not(.volume)').toArray()) {
        const id = $('a', chapter).attr('href') ?? ''
        const name = "Chapitre " + decodeHTMLEntity($('a', chapter).text().split(" ").pop() ?? '')
        const chapNum = Number(id.split('/').pop())
        const time = new Date($('.date-chapter-title-rtl', chapter).text() ?? '')

        chapters.push(createChapter({
            id,
            mangaId,
            name,
            langCode: LanguageCode.FRENCH,
            chapNum,
            time
        }))
    }

    return chapters
}


/////////////////////////////////
/////    CHAPTER DETAILS    /////
/////////////////////////////////

export const parseMangaScanChapterDetails = ($: CheerioStatic, mangaId: string, chapterId: string): ChapterDetails => {
    const pages: string[] = []

    for (let item of $('img', '.viewer-cnt #all').toArray()) {
        let page = $(item).attr('data-src')?.trim().split("/")[0] == "" ? 'https:' + $(item).attr('data-src')?.trim() : $(item).attr('data-src')?.trim()

        if (typeof page === 'undefined')
            continue;

        pages.push(page);
    }

    return createChapterDetails({
        id: chapterId,
        mangaId: mangaId,
        pages,
        longStrip: false
    })
}


////////////////////////
/////    SEARCH    /////
////////////////////////

export const parseSearch = ($: CheerioStatic): MangaTile[] => {
    const manga: MangaTile[] = []

    for (const item of $('.media').toArray()) {
        let url = $('h5 a', item).attr('href')?.split("/")[4]
        let image = getMangaThumbnail(url)
        let title = decodeHTMLEntity($('h5', item).text())
        let subtitle = "Chapitre " + decodeHTMLEntity($('a', item).eq(2).text().trim().replace(/#/g, ""))

        if (typeof url === 'undefined' || typeof image === 'undefined')
            continue

        manga.push(createMangaTile({
            id: url,
            image: image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }

    return manga
}


//////////////////////////////////////
/////    LAST MANGAS RELEASED    /////
//////////////////////////////////////

const parseLatestManga = ($: CheerioStatic): MangaTile[] => {
    const latestManga: MangaTile[] = []

    for (const item of $('.mangalist .manga-item').toArray()) {
        let url = $('a', item).first().attr('href')?.split("/").pop()
        let image = getMangaThumbnail(url)
        let title = decodeHTMLEntity($('a', item).first().text())
        let subtitle = "Chapitre " + decodeHTMLEntity(($('a', item).eq(1).text().trim().match(/(\d)+[.]?(\d)*/gm) ?? "")[0])

        if (typeof url === 'undefined' || typeof image === 'undefined')
            continue

        latestManga.push(createMangaTile({
            id: url,
            image: image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle }),
        }))
    }

    return latestManga
}

///////////////////////////////////////////////
/////    LATEST POPULAR MANGAS UPDATED    /////
///////////////////////////////////////////////

const parseLatestPopularMangaUpdated = ($: CheerioStatic): MangaTile[] => {
    const popularManga: MangaTile[] = []

    for (const item of $('.hot-thumbnails li').toArray()) {
        let url = $('a', item).first().attr('href')?.split("/")[4]
        let image = getMangaThumbnail(url)
        let title = decodeHTMLEntity($('.manga-name a', item).first().text())
        let subtitle = "Chapitre " + decodeHTMLEntity($('p', item).text().trim().split(' ').reverse()[1])

        if (typeof url === 'undefined' || typeof image === 'undefined')
            continue

        popularManga.push(createMangaTile({
            id: url,
            image: image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }))
    }

    return popularManga
}

///////////////////////////
/////    TOP MANGA    /////
///////////////////////////

const parseTopManga = ($: CheerioStatic): MangaTile[] => {
    const topManga: MangaTile[] = []

    for (const item of $('.panel.panel-success').eq(0).find('ul .list-group-item').toArray()) {
        let url = $('a', item).first().attr('href')?.split("/").pop()
        let image = getMangaThumbnail(url)
        let title = decodeHTMLEntity($('strong', item).text())
        let subtitle = "👀 " + $('.media-body', item).text().split('\n')[2].trim().replace(/\B(?=(\d{3})+(?!\d))/g, " ")

        if (typeof url === 'undefined' || typeof image === 'undefined')
            continue

        topManga.push(createMangaTile({
            id: url,
            image: image,
            title: createIconText({ text: title }),
            subtitleText: createIconText({ text: subtitle })
        }))
    }

    return topManga
}

//////////////////////////////
/////    HOME SECTION    /////
//////////////////////////////

export const parseHomeSections = ($: CheerioStatic, sections: HomeSection[], sectionCallback: (section: HomeSection) => void): void => {
    for (const section of sections) sectionCallback(section)
    const popularManga: MangaTile[] = parseLatestPopularMangaUpdated($)
    const latestManga: MangaTile[] = parseLatestManga($)
    const topManga: MangaTile[] = parseTopManga($)

    sections[0].items = popularManga
    sections[1].items = latestManga
    sections[2].items = topManga

    for (const section of sections) sectionCallback(section)
}


//////////////////////
/////    TAGS    /////
//////////////////////

export const parseTags = ($: CheerioStatic): TagSection[] => {
    const arrayTags: Tag[] = []

    for (let item of $('.list-category a').toArray()) {
        let id = ($(item).attr('href') ?? '').split('/').pop() ?? ''
        let label = capitalizeFirstLetter(decodeHTMLEntity($(item).text()))

        arrayTags.push({ id: id, label: label })
    }
    const tagSections: TagSection[] = [createTagSection({ id: '0', label: 'genres', tags: arrayTags.map(x => createTag(x)) })]

    return tagSections
}

/////////////////////////////////
/////    CHECK LAST PAGE    /////
/////////////////////////////////

export const isLastPage = ($: CheerioStatic): boolean => {
    return $('.pagination li').last().hasClass('disabled')
}


///////////////////////////////
/////    UPDATED MANGA    /////
///////////////////////////////

export interface UpdatedManga {
    ids: string[];
    loadMore: boolean;
}

export const parseUpdatedManga = ($: CheerioStatic, time: Date, ids: string[]): UpdatedManga => {
    const manga: string[] = []
    let loadMore = true

    for (const item of $('.mangalist .manga-item').toArray()) {
        let id = ($('a', item).first().attr('href') ?? '').split('/').pop() ?? ''
        let mangaTime = parseDate($('.pull-right', item).text().trim() ?? '')

        if (mangaTime > time)
            if (ids.includes(id))
                manga.push(id)
            else loadMore = false
    }

    return {
        ids: manga,
        loadMore,
    }
}


/////////////////////////////////
/////    ADDED FUNCTIONS    /////
/////////////////////////////////

function decodeHTMLEntity(str: string) {
    return str.replace(/&#(\d+);/g, function (match, dec) {
        return String.fromCharCode(dec);
    })
}

function parseDate(str: string) {
    if (str.length == 0) {
        let date = new Date()
        return new Date(date.getFullYear(), date.getMonth(), date.getDate())
    }

    switch (str.trim()) {
        case "Aujourd'hui":
            let today = new Date()
            return new Date(today.getFullYear(), today.getMonth(), today.getDate(), today.getHours(), today.getMinutes())

        case "Hier":
            let yesterday = new Date()
            return new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate() - 1, yesterday.getHours(), yesterday.getMinutes())

        default:
            let date = str.split("/")
            return new Date(parseInt(date[2]), parseInt(date[1]) - 1, parseInt(date[0]))
    }
}

function capitalizeFirstLetter(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}
