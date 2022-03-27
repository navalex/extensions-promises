import {
	Source,
	Manga,
	Chapter,
	ChapterDetails,
	SearchRequest,
	PagedResults,
	SourceInfo,
	TagType }
from "paperback-extensions-common"
import { generateSearch, parseChapterDetails, parseChapters, parseMangaDetails, parseSearch } from "./ScanFRParser"

const SFR_DOMAIN = 'https://scan-fr.cc/'
const method = 'GET'

export const ScanFRInfo: SourceInfo = {
	version: '2.0.2',
	name: 'ScanFR',
	icon: 'icon.png',
	author: 'Alexandre Navaro',
	authorWebsite: 'https://github.com/Navalex',
	description: 'Extension that pulls manga from scan-fr.cc',
	hentaiSource: false,
	websiteBaseURL: SFR_DOMAIN,
	sourceTags: [
		{
			text: "Notifications",
			type: TagType.GREEN
		}
	]
}

export class ScanFR extends Source {
	readonly cookies = [createCookie({ name: 'set', value: 'h=1', domain: SFR_DOMAIN })]

	async getMangaDetails(mangaId: string): Promise<Manga> {
		const detailsRequest = createRequestObject({
			url: `${SFR_DOMAIN}/manga/${mangaId}`,
			cookies: this.cookies,
			method,
		})

		const response = await this.requestManager.schedule(detailsRequest, 1)
		const $ = this.cheerio.load(response.data)
		return parseMangaDetails($, mangaId)
	}

	async getChapters(mangaId: string): Promise<Chapter[]> {
		const request = createRequestObject({
			url: `${SFR_DOMAIN}/manga/${mangaId}`,
			method,
		})

		const response = await this.requestManager.schedule(request, 1)
		const $ = this.cheerio.load(response.data)
		return parseChapters($, mangaId)
	}

	async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
		const request = createRequestObject({
			url: `${SFR_DOMAIN}/manga/${mangaId}/${chapterId}/1`,
			method,
			cookies: this.cookies
		})

		const response = await this.requestManager.schedule(request, 1)
		const $ = this.cheerio.load(response.data)
		return parseChapterDetails($, mangaId, chapterId)
	}

	async searchRequest(query: SearchRequest, metadata: any): Promise<PagedResults> {
		const search = generateSearch(query)
		const request = createRequestObject({
			url: `${SFR_DOMAIN}/search?${search}`,
			method: 'GET',
			cookies: this.cookies,
		})

		const response = await this.requestManager.schedule(request, 1)
		const manga = parseSearch(response.data)

		return createPagedResults({
			results: manga,
			metadata,
		})
	}
}
