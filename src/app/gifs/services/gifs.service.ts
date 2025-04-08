import { HttpClient } from '@angular/common/http';
import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { environment } from '@environments/environment';
import type { GiphyResponse } from '../interfaces/giphy.interfaces';
import { Gif } from '../interfaces/gif.interface';
import { GifMapper } from '../mapper/gif.mapper';
import { map, Observable, tap } from 'rxjs';

@Injectable({providedIn: 'root'})
export class GifService {
  private http = inject(HttpClient);
  trendingGifs = signal<Gif[]>([]);
  trendingGifsLoading = signal<boolean>(true);
  searchHistory = signal<Record<string, Gif[]>>({});
  // cuando queremos tener algo calculado usamos propiedades computadas
  searchHistoryKey = computed(() => Object.keys(this.searchHistory()));

  constructor() {
    this.loadTrendingGifs();
    this.getHistoryFromLocalStorage();
  }

  // cada vez que se actualiza el search history que es una senial se guarda en local storage
  saveGifsToLocalStorage = effect(() => {
    localStorage.setItem('gifs', JSON.stringify(this.searchHistory()));
  });

  loadTrendingGifs() {
    this.http.get<GiphyResponse>(`${ environment.guphyUrl }/gifs/trending`, {
      params: {
        api_key: environment.giphyApiKey,
        limit: 20,
      }
    }).subscribe( (resp) => {
      const gifs = GifMapper.mapGiphyItemsToGifArray(resp.data);
      this.trendingGifs.set(gifs);
      this.trendingGifsLoading.set(false);
    });
  }

  searchGifs(query: string): Observable<Gif[]> {
    return this.http.get<GiphyResponse>(`${ environment.guphyUrl }/gifs/search`, {
      params: {
        api_key: environment.giphyApiKey,
        limit: 20,
        q: query,
      }
    }).pipe(
      map( ({ data }) => data),
      map( (items) => GifMapper.mapGiphyItemsToGifArray(items) ),
      // efecto secundario
      tap( (items) => {
        this.searchHistory.update( (history) => ({
          ...history,
          [query.toLowerCase()]: items,
        }));
      }),
    );
    // si no hay subscribe no se ejecuta el observable por lo tanto no se ejecuta la peticion
    // si queremos trasnformar el observable para que devuelva un array de gifs necesitamos usar un pipe como tap
    // el tap no modifica la respuesta, solo ejecuta un efecto secundario pero map si
  }

  getHistoryGifs( query: string ): Gif[] {
    return this.searchHistory()[query.toLowerCase()] ?? [];
  };

  getHistoryFromLocalStorage() {
    const history = localStorage.getItem('gifs') ?? '{}';
    this.searchHistory.set(JSON.parse(history));
  }
}
