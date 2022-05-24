import {
	Source,
	Manga,
	Chapter,
	ChapterDetails,
	HomeSection,
	SearchRequest,
	TagSection,
	PagedResults,
	SourceInfo,
	MangaUpdates,
	TagType,
	RequestManager,
	ContentRating,
	MangaTile
} from "paperback-extensions-common"

import {
	isLastPage,
	parseHomeSections,
	parseMangaScanChapterDetails,
	parseMangaScanChapters,
	parseMangaScanMangaDetails,
	parseSearch,
	parseTags,
	UpdatedManga,
	parseUpdatedManga
} from "./MangaScanParser";

const SCANFR_DOMAIN = "https://mangascan-vf.cc/";
const method = 'GET'
const headers = {
	'Host': 'mangascan-vf.cc',
}

export const MangaScanInfo: SourceInfo = {
	version: '1.0.0',
	name: 'MangaScan',
	icon: 'logo.png',
	author: 'Navalex',
	authorWebsite: 'https://github.com/navalex',
	description: 'Source française mangascan.cc',
	contentRating: ContentRating.MATURE,
	websiteBaseURL: SCANFR_DOMAIN,
	sourceTags: [
		{
			text: "Francais",
			type: TagType.GREY
		},
		{
			text: 'Notifications',
			type: TagType.GREEN
		}
	]
}

export class MangaScan extends Source {

	requestManager: RequestManager = createRequestManager({
		requestsPerSecond: 3
	});


	/////////////////////////////////
	/////    MANGA SHARE URL    /////
	/////////////////////////////////

	getMangaShareUrl(mangaId: string): string {
		return `${SCANFR_DOMAIN}/manga/${mangaId}`
	}


	///////////////////////////////
	/////    MANGA DETAILS    /////
	///////////////////////////////

	async getMangaDetails(mangaId: string): Promise<Manga> {
		const request = createRequestObject({
			url: `${SCANFR_DOMAIN}/manga/${mangaId}`,
			method,
			headers
		})

		const response = await this.requestManager.schedule(request, 5);
		const $ = this.cheerio.load(response.data);

		return await parseMangaScanMangaDetails($, mangaId);
	}


	//////////////////////////
	/////    CHAPTERS    /////
	//////////////////////////

	async getChapters(mangaId: string): Promise<Chapter[]> {
		const request = createRequestObject({
			url: `${SCANFR_DOMAIN}/manga/${mangaId}`,
			method,
			headers
		})

		const response = await this.requestManager.schedule(request, 5);
		const $ = this.cheerio.load(response.data);

		return await parseMangaScanChapters($, mangaId);
	}


	//////////////////////////////////
	/////    CHAPTERS DETAILS    /////
	//////////////////////////////////

	async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
		const request = createRequestObject({
			url: `${chapterId}`,
			method,
			headers
		})

		const response = await this.requestManager.schedule(request, 5);
		const $ = this.cheerio.load(response.data);

		return await parseMangaScanChapterDetails($, mangaId, chapterId);
	}


	////////////////////////////////
	/////    SEARCH REQUEST    /////
	////////////////////////////////

	async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
		const page: number = metadata?.page ?? 1
		const search = query.title?.replace(/ /g, '+').replace(/[’'´]/g, '%27') ?? ""
		let manga: MangaTile[] = []

		if (query.includedTags && query.includedTags?.length != 0) {

			const request = createRequestObject({
				url: `${SCANFR_DOMAIN}/filterList?page=${page}&tag=${query.includedTags[0].id}&alpha=${search}&sortBy=name&asc=true`,
				method,
				headers
			})

			const response = await this.requestManager.schedule(request, 5)
			const $ = this.cheerio.load(response.data)

			manga = parseSearch($)
			metadata = !isLastPage($) ? { page: page + 1 } : undefined
		}
		else {
			const request = createRequestObject({
				url: `${SCANFR_DOMAIN}/filterList?page=${page}&alpha=${search}&sortBy=name&asc=true`,
				method,
				headers
			})

			const response = await this.requestManager.schedule(request, 5)
			const $ = this.cheerio.load(response.data)

			manga = parseSearch($)
			metadata = !isLastPage($) ? { page: page + 1 } : undefined
		}

		return createPagedResults({
			results: manga,
			metadata
		})
	}


	//////////////////////////////
	/////    HOME SECTION    /////
	//////////////////////////////

	async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
		const section1 = createHomeSection({ id: 'latest_popular_manga', title: 'Dernier Manga Populaire Sorti' })
		const section2 = createHomeSection({ id: 'latest_updates', title: 'Dernier Manga Sorti' })
		const section3 = createHomeSection({ id: 'top_manga', title: 'Top MANGA' })

		const request1 = createRequestObject({
			url: `${SCANFR_DOMAIN}`,
			method: 'GET'
		})

		const response1 = await this.requestManager.schedule(request1, 5)
		const $1 = this.cheerio.load(response1.data)

		parseHomeSections($1, [section1, section2, section3], sectionCallback)
	}


	//////////////////////
	/////    TAGS    /////
	//////////////////////

	async getSearchTags(): Promise<TagSection[]> {
		const request = createRequestObject({
			url: `${SCANFR_DOMAIN}/manga-list`,
			method,
			headers
		})

		const response = await this.requestManager.schedule(request, 5)
		const $ = this.cheerio.load(response.data)

		return parseTags($)
	}


	//////////////////////////////////////
	/////    FILTER UPDATED MANGA    /////
	//////////////////////////////////////

	async filterUpdatedManga(mangaUpdatesFoundCallback: (updates: MangaUpdates) => void, time: Date, ids: string[]): Promise<void> {
		let updatedManga: UpdatedManga = {
			ids: [],
			loadMore: true
		}

		while (updatedManga.loadMore) {
			const request = createRequestObject({
				url: `${SCANFR_DOMAIN}`,
				method,
				headers
			})

			const response = await this.requestManager.schedule(request, 5)
			const $ = this.cheerio.load(response.data)

			updatedManga = parseUpdatedManga($, time, ids)
			if (updatedManga.ids.length > 0) {
				mangaUpdatesFoundCallback(createMangaUpdates({
					ids: updatedManga.ids
				}));
			}
		}
	}
}
